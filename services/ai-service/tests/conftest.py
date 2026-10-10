from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
import jwt
import pytest
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from pydantic import SecretStr
from sqlalchemy import event

from app.config import Settings
from app.db.models import Base
from app.db.store import Store
from app.main import create_app
from app.providers import FakeParser
from app.service import ConversationService

NOW = datetime(2030, 1, 7, 0, tzinfo=timezone.utc)
CENTER = "11111111-1111-4111-8111-111111111111"
COURT = "22222222-2222-4222-8222-222222222221"
SECRET = "ai-test-private-key-with-at-least-32-characters"


def config(url):
    return Settings(
        ai_database_url=url,
        ai_provider="fake",
        ai_offline=True,
        jwt_secret=SecretStr(SECRET),
        metrics_token=SecretStr("test-monitor"),
        booking_core_url="http://core",
    )


def token(sub="customer", role="user", **extra):
    return jwt.encode(
        {
            "sub": sub,
            "role": role,
            "name": sub,
            "iss": "badminton-identity",
            "aud": "badminton-system",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            **extra,
        },
        SECRET,
        algorithm="HS256",
    )


class CoreFixture:
    """Protocol fixture only. Real Core/Postgres also covered by test_live_core.py."""

    def __init__(self):
        self.occupied = set()
        self.reservations = {}
        self.bookings = {}
        self.price = 80000
        self.confirms = 0
        self.fail_confirm_once = False
        self.fail_after_commit_once = False
        self.requests = []

    def transport(self, request):
        self.requests.append((request.method, request.url.path))
        path = request.url.path
        if path == "/health/ready":
            return httpx.Response(200, json={"status": "ready"})
        if path == "/api/v1/centers":
            return httpx.Response(
                200,
                json={
                    "items": [
                        {
                            "id": CENTER,
                            "name": "Sân Cầu Giấy",
                            "address": "18 Duy Tân, Cầu Giấy",
                            "isActive": True,
                        }
                    ],
                    "total": 1,
                },
            )
        if path.endswith("/availability"):
            return httpx.Response(
                200,
                json={
                    "courts": [
                        {
                            "id": COURT,
                            "name": "Sân 1",
                            "isActive": True,
                            "slots": [
                                {
                                    "minute": m,
                                    "price": self.price,
                                    "available": m not in self.occupied,
                                    "state": "AVAILABLE" if m not in self.occupied else "BOOKED",
                                }
                                for m in range(300, 1440, 60)
                            ],
                        }
                    ]
                },
            )
        if path == "/api/v1/reservations" and request.method == "POST":
            import json

            body = json.loads(request.content)
            key = request.headers["idempotency-key"]
            sub = jwt.decode(
                request.headers["authorization"][7:],
                SECRET,
                algorithms=["HS256"],
                audience="badminton-system",
            )["sub"]
            if key in self.reservations:
                return httpx.Response(201, json=self.reservations[key])
            slots = body["selections"][0]["slots"]
            if any(m in self.occupied for m in slots):
                return httpx.Response(409, json={"message": "conflict"})
            data = {
                "id": str(uuid4()),
                "totalPrice": len(slots) * self.price,
                "status": "HELD",
                "slots": slots,
                "userId": sub,
                "date": body["date"],
            }
            self.occupied.update(slots)
            self.reservations[key] = data
            return httpx.Response(201, json=data)
        if "/reservations/" in path:
            id = path.split("/")[4]
            res = next(v for v in self.reservations.values() if v["id"] == id)
            if request.method == "DELETE":
                self.occupied.difference_update(res["slots"])
                res["status"] = "CANCELLED"
                return httpx.Response(200, json=res)
            if path.endswith("/confirm"):
                if self.fail_confirm_once:
                    self.fail_confirm_once = False
                    raise httpx.ReadTimeout("lost", request=request)
                if id not in self.bookings:
                    self.confirms += 1
                    self.bookings[id] = {
                        "id": str(uuid4()),
                        "status": "CONFIRMED",
                        "userId": res["userId"],
                        "totalPrice": res["totalPrice"],
                        "selections": [
                            {"courtId": COURT, "courtName": "Sân 1", "slots": res["slots"]}
                        ],
                        "date": res["date"],
                    }
                if self.fail_after_commit_once:
                    self.fail_after_commit_once = False
                    raise httpx.ReadTimeout("receipt lost after commit", request=request)
                return httpx.Response(200, json=self.bookings[id])
        return httpx.Response(404, json={"message": "unknown"})


@pytest.fixture
async def env(tmp_path):
    c = config("sqlite+aiosqlite:///" + str(tmp_path / "conversations.sqlite"))
    store = Store(c.ai_database_url)

    @event.listens_for(store.engine.sync_engine, "connect")
    def sqlite_fk(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    async with store.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    core = CoreFixture()
    async with AsyncSqliteSaver.from_conn_string(str(tmp_path / "checkpoints.sqlite")) as saver:
        async with httpx.AsyncClient(
            base_url="http://core", transport=httpx.MockTransport(core.transport)
        ) as upstream:
            service = ConversationService(store, saver, FakeParser, upstream, c, clock=lambda: NOW)
            app = create_app(service, c)
            async with httpx.AsyncClient(
                base_url="http://ai", transport=httpx.ASGITransport(app=app)
            ) as client:
                yield {
                    "client": client,
                    "core": core,
                    "service": service,
                    "config": c,
                    "store": store,
                    "checkpointer": saver,
                    "tmp_path": tmp_path,
                }
    await store.engine.dispose()


async def create(env, sub="customer"):
    r = await env["client"].post(
        "/api/conversations", headers={"Authorization": "Bearer " + token(sub)}
    )
    assert r.status_code == 201, r.text
    return r.json()["conversation_id"]


async def send(env, id, text, sub="customer", **extra):
    r = await env["client"].post(
        f"/api/conversations/{id}/messages",
        headers={"Authorization": "Bearer " + token(sub), "X-Request-Id": "ai-test-correlation"},
        json={"text": text, "client_message_id": str(uuid4()), **extra},
    )
    assert r.status_code == 200, r.text
    return r.json()
