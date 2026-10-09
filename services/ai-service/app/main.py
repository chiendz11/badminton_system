import hmac
import re
import time
from contextlib import AsyncExitStack, asynccontextmanager
from uuid import UUID, uuid4

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from prometheus_client import generate_latest
from sqlalchemy import text

from app.auth import verify_actor
from app.config import settings
from app.core_client import BookingCoreClient, CoreError
from app.db.store import Store
from app.observability import latency, log, registry, requests
from app.providers import FakeParser, LLMParser
from app.service import ConversationService


@asynccontextmanager
async def lifespan(app):
    config = settings()
    async with AsyncExitStack() as stack:
        store = Store(config.ai_database_url)
        checkpointer = await stack.enter_async_context(
            AsyncPostgresSaver.from_conn_string(config.checkpoint_url)
        )
        # Tables are initialized by the migration command, not by runtime DDL.
        core_http = await stack.enter_async_context(
            httpx.AsyncClient(
                base_url=config.booking_core_url,
                timeout=config.core_timeout_seconds,
                follow_redirects=False,
            )
        )
        service = ConversationService(
            store,
            checkpointer,
            lambda: FakeParser() if config.ai_provider == "fake" else LLMParser(config),
            core_http,
            config,
        )
        app.state.service = service
        try:
            yield
        finally:
            await store.engine.dispose()


def create_app(service=None, config=None):
    app = FastAPI(
        title="Badminton Conversational Planning",
        version="0.1.0",
        lifespan=lifespan if service is None else None,
    )
    if service is not None:
        app.state.service = service
    active_config = config

    def cfg():
        return active_config or settings()

    async def actor(authorization: str = Header(default="")):
        if not authorization.startswith("Bearer "):
            raise HTTPException(401, "Cần bearer token")
        return verify_actor(authorization[7:], cfg())

    @app.middleware("http")
    async def observe(request: Request, call_next):
        candidate = request.headers.get("x-request-id", "")
        request.state.request_id = (
            candidate if re.fullmatch(r"[A-Za-z0-9_-]{8,64}", candidate) else str(uuid4())
        )
        started = time.monotonic()
        # Bound JSON before parsing, including bodies that omit Content-Length.
        if request.method == "POST":
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 8192:
                    return JSONResponse(
                        {"detail": "Request quá lớn", "requestId": request.state.request_id},
                        status_code=413,
                        headers={"X-Request-Id": request.state.request_id},
                    )
                chunks.append(chunk)
            # Starlette's request cache lets downstream JSON parsing consume this bounded body.
            request._body = b"".join(chunks)
        try:
            response = await call_next(request)
        except Exception:
            log("http.failed", requestId=request.state.request_id)
            response = JSONResponse(
                {
                    "detail": "AI service chưa hoàn tất yêu cầu",
                    "requestId": request.state.request_id,
                },
                status_code=503,
            )
        route = getattr(request.scope.get("route"), "path", "unmatched")
        if route != "/metrics":
            requests.labels(request.method, route, str(response.status_code)).inc()
            latency.labels(route).observe(time.monotonic() - started)
        response.headers["X-Request-Id"] = request.state.request_id
        log(
            "http.completed",
            requestId=request.state.request_id,
            method=request.method,
            route=route,
            status=response.status_code,
            durationMs=round(1000 * (time.monotonic() - started)),
        )
        return response

    @app.get("/health/live")
    async def live():
        return {"status": "live", "provider": cfg().ai_provider, "slot_minutes": 60}

    @app.get("/health/ready")
    async def ready():
        try:
            async with app.state.service.store.engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            response = await app.state.service.core_http.get("/health/ready")
            if response.status_code != 200:
                raise ValueError("Core unavailable")
            # Persistence must have been initialized.
            await app.state.service.checkpointer.aget_tuple(
                {"configurable": {"thread_id": "readiness"}}
            )
        except Exception:
            raise HTTPException(503, "AI DB, checkpoint hoặc Booking Core chưa sẵn sàng") from None
        return {"status": "ready"}

    @app.get("/metrics")
    async def metrics(authorization: str = Header(default="")):
        token = cfg().metrics_token.get_secret_value()
        if not token or not hmac.compare_digest(authorization, "Bearer " + token):
            raise HTTPException(401, "Cần monitoring token")
        return Response(generate_latest(registry), media_type="text/plain; version=0.0.4")

    @app.post("/api/conversations", status_code=201)
    async def create(current=Depends(actor)):
        id = await app.state.service.store.create(current.user_id)
        return {"conversation_id": id, "provider": cfg().ai_provider, "slot_minutes": 60}

    @app.get("/api/conversations/{conversation_id}")
    async def read(conversation_id: UUID, current=Depends(actor)):
        return await app.state.service.store.read(str(conversation_id), current)

    from app.schemas import MessageRequest

    @app.post("/api/conversations/{conversation_id}/messages")
    async def message(
        conversation_id: UUID,
        body: MessageRequest,
        request: Request,
        current=Depends(actor),
        authorization: str = Header(default=""),
    ):
        return await app.state.service.message(
            str(conversation_id), body, current, authorization[7:], request.state.request_id
        )

    @app.get("/api/conversations/{conversation_id}/trace")
    async def trace(conversation_id: UUID, current=Depends(actor)):
        return await app.state.service.store.traces(str(conversation_id), current)

    @app.get("/api/bookings/{booking_id}")
    async def booking(
        booking_id: UUID,
        request: Request,
        current=Depends(actor),
        authorization: str = Header(default=""),
    ):
        try:
            result = await BookingCoreClient(
                app.state.service.core_http, authorization[7:], request.state.request_id
            ).booking(str(booking_id))
            if result.get("userId") != current.user_id:
                raise HTTPException(403, "Chỉ đọc booking của mình qua chatbot")
            return result
        except CoreError as error:
            raise HTTPException(error.status, error.message) from None

    return app


app = create_app()
