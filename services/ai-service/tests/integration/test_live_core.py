"""Live Core/real PostgreSQL tests. CI builds Core in an isolated Docker network.

For a local non-Docker run, provide all AI_LIVE_* variables for test-owned DBs.
Never point these tests at an application database.
"""

import asyncio
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
import psycopg
import pytest
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import SecretStr

from app.config import Settings
from app.db.models import Base
from app.db.store import Store
from app.main import create_app
from app.providers import FakeParser
from app.service import ConversationService
from tests.conftest import SECRET, token

ROOT = Path(__file__).resolve().parents[4]


@pytest.fixture(scope="module")
def live_urls():
    core = os.environ.get("AI_LIVE_CORE_URL")
    core_db = os.environ.get("AI_LIVE_CORE_DATABASE_URL")
    ai_db = os.environ.get("AI_LIVE_DATABASE_URL")
    if core:
        if (
            not core_db
            or not ai_db
            or not urlparse(core_db).path.endswith("_test")
            or not urlparse(ai_db).path.endswith("_test")
        ):
            raise ValueError("Live URLs require separate test-owned *_test databases")
        yield core, core_db, ai_db
        return
    import docker

    try:
        client = docker.from_env()
        client.ping()
    except docker.errors.DockerException:
        if os.environ.get("CI") == "true":
            pytest.fail("CI must run live Core/PostgreSQL integration; Docker is required")
        pytest.skip("Docker unavailable; use AI_LIVE_* with isolated test databases")
    from testcontainers.core.container import DockerContainer
    from testcontainers.core.network import Network
    from testcontainers.postgres import PostgresContainer

    with Network() as network:
        with (
            PostgresContainer(
                "postgres:16-alpine",
                username="booking",
                password="booking_test",
                dbname="booking_test",
            )
            .with_network(network)
            .with_network_aliases("core-db") as pg
        ):
            core_db = pg.get_connection_url().replace("postgresql+psycopg2://", "postgresql://")
            with PostgresContainer(
                "postgres:16-alpine", username="ai", password="ai_test", dbname="ai_test"
            ) as ai_pg:
                ai_db = ai_pg.get_connection_url().replace(
                    "postgresql+psycopg2://", "postgresql+psycopg://"
                )
                tag = "badminton-ai-live-core-test:local"
                client.images.build(
                    path=str(ROOT),
                    dockerfile="services/booking-core/Dockerfile",
                    target="build",
                    tag=tag,
                    rm=True,
                )
                service = (
                    DockerContainer(tag)
                    .with_network(network)
                    .with_exposed_ports(3000)
                    .with_env(
                        "DATABASE_URL",
                        "postgresql://booking:booking_test@core-db:5432/booking_test",
                    )
                    .with_env("JWT_SECRET", SECRET)
                    .with_env("METRICS_TOKEN", "test-monitor")
                    .with_env("NODE_ENV", "test")
                    .with_env("ENABLE_DEMO_AUTH", "false")
                    .with_command(
                        "sh -c 'pnpm --filter @badminton/booking-core prisma:migrate:deploy && node services/booking-core/dist/main.js'"
                    )
                )
                with service:
                    core = (
                        "http://"
                        + service.get_container_host_ip()
                        + ":"
                        + str(service.get_exposed_port(3000))
                    )
                    for attempt in range(100):
                        try:
                            if httpx.get(core + "/health/ready", timeout=1).status_code == 200:
                                break
                        except httpx.HTTPError:
                            pass
                        time.sleep(0.3)
                    else:
                        raise RuntimeError("Live Core never became ready")
                    yield core, core_db, ai_db


@pytest.fixture
async def live(live_urls):
    core, core_db, ai_db = live_urls
    center, court = str(uuid4()), str(uuid4())
    with psycopg.connect(core_db, autocommit=True) as conn:
        conn.execute(
            'INSERT INTO "Center" (id,"managerId",name,address,phone,facilities,"updatedAt") VALUES (%s,%s,%s,%s,%s,%s,NOW())',
            (center, "manager", "AA AI live " + center, "Cầu Giấy", "0901234567", []),
        )
        conn.execute(
            'INSERT INTO "Court" (id,"centerId",name) VALUES (%s,%s,%s)',
            (court, center, "Sân AI live"),
        )
        for day in ["WEEKDAY", "WEEKEND"]:
            conn.execute(
                'INSERT INTO "PricingBand" (id,"centerId","dayType","startMinute","endMinute","pricePerHour") VALUES (%s,%s,%s,300,1440,80000)',
                (str(uuid4()), center, day),
            )
    c = Settings(
        ai_database_url=ai_db,
        booking_core_url=core,
        jwt_secret=SecretStr(SECRET),
        metrics_token=SecretStr("test-monitor"),
        ai_provider="fake",
        ai_offline=True,
    )
    store = Store(ai_db)
    # Tests create only AI tables in an isolated *_test DB; production uses committed Alembic migrations.
    async with store.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with AsyncPostgresSaver.from_conn_string(c.checkpoint_url) as saver:
        await saver.setup()
        async with httpx.AsyncClient(base_url=core, timeout=5) as upstream:
            service = ConversationService(store, saver, FakeParser, upstream, c)
            async with httpx.AsyncClient(
                base_url="http://ai", transport=httpx.ASGITransport(app=create_app(service, c))
            ) as client:
                yield client, center, court, core_db, store, saver, service
    await store.engine.dispose()
    with psycopg.connect(core_db, autocommit=True) as conn:
        # Delete only the fixture centre and its records, never reset unrelated test data.
        ids = [
            row[0]
            for row in conn.execute('SELECT id FROM "Reservation" WHERE "centerId"=%s', (center,))
        ]
        if ids:
            conn.execute(
                'DELETE FROM "OutboxEvent" WHERE "aggregateId" IN (SELECT id FROM "Booking" WHERE "reservationId"=ANY(%s))',
                (ids,),
            )
            conn.execute('DELETE FROM "Booking" WHERE "reservationId"=ANY(%s)', (ids,))
            conn.execute('DELETE FROM "SlotAllocation" WHERE "reservationId"=ANY(%s)', (ids,))
            conn.execute('DELETE FROM "Reservation" WHERE id=ANY(%s)', (ids,))
        conn.execute('DELETE FROM "PricingBand" WHERE "centerId"=%s', (center,))
        conn.execute('DELETE FROM "Court" WHERE "centerId"=%s', (center,))
        conn.execute('DELETE FROM "Center" WHERE id=%s', (center,))


async def pick(client, center, sub="customer"):
    headers = {"Authorization": "Bearer " + token(sub)}
    id = (await client.post("/api/conversations", headers=headers)).json()["conversation_id"]

    def body(text, **extra):
        return {"text": text, "client_message_id": str(uuid4()), **extra}

    result = (
        await client.post(
            "/api/conversations/" + id + "/messages",
            headers=headers,
            json=body("Mai lúc 19:00 chơi 2 tiếng, dưới 200k, gần Cầu Giấy"),
        )
    ).json()
    option = next(option for option in result["options"] if option["center_id"] == center)
    result = (
        await client.post(
            "/api/conversations/" + id + "/messages",
            headers=headers,
            json=body("Chọn sân", action="select", option_id=option["option_id"]),
        )
    ).json()
    return (
        id,
        headers,
        body("Xác nhận đặt sân", action="confirm", confirmation_id=result["confirmation_id"]),
    )


async def test_live_booking_commits_two_slots_and_pg_checkpoint(live):
    client, center, court, db, store, saver, service = live
    id, headers, body = await pick(client, center)
    result = (
        await client.post("/api/conversations/" + id + "/messages", headers=headers, json=body)
    ).json()
    assert result["booking"]["status"] == "CONFIRMED" and result["booking"]["selections"][0][
        "slots"
    ] == [1140, 1200]
    with psycopg.connect(db) as conn:
        assert (
            conn.execute(
                'SELECT count(*) FROM "SlotAllocation" WHERE "courtId"=%s', (court,)
            ).fetchone()[0]
            == 2
        )
        assert (
            conn.execute(
                'SELECT count(*) FROM "Booking" WHERE id=%s', (result["booking"]["id"],)
            ).fetchone()[0]
            == 1
        )
        assert (
            conn.execute(
                'SELECT count(*) FROM "OutboxEvent" WHERE "aggregateId"=%s',
                (result["booking"]["id"],),
            ).fetchone()[0]
            == 1
        )
    checkpoint = await saver.aget_tuple({"configurable": {"thread_id": id}})
    assert (
        checkpoint.checkpoint["channel_values"]["state"]["booking"]["id"] == result["booking"]["id"]
    )
    assert headers["Authorization"][7:] not in json.dumps(checkpoint.checkpoint["channel_values"])
    replay = (
        await client.post("/api/conversations/" + id + "/messages", headers=headers, json=body)
    ).json()
    assert replay["booking"]["id"] == result["booking"]["id"]


async def test_two_chat_clients_compete_only_one_booking_commits(live):
    client, center, court, db, *_ = live
    a, b = await pick(client, center, "a"), await pick(client, center, "b")
    results = await asyncio.gather(
        *[
            client.post("/api/conversations/" + id + "/messages", headers=h, json=body)
            for id, h, body in [a, b]
        ]
    )
    assert sorted(result.json()["action"] for result in results) == ["BOOKED", "SLOT_UNAVAILABLE"]
    with psycopg.connect(db) as conn:
        assert (
            conn.execute(
                'SELECT count(*) FROM "Booking" b JOIN "Reservation" r ON r.id=b."reservationId" WHERE r."centerId"=%s',
                (center,),
            ).fetchone()[0]
            == 1
        )
        assert (
            conn.execute(
                'SELECT count(*) FROM "SlotAllocation" WHERE "courtId"=%s', (court,)
            ).fetchone()[0]
            == 2
        )


async def test_postgres_lock_covers_independent_service_connection_pools(live):
    client, _, _, _, store, saver, service = live
    headers = {"Authorization": "Bearer " + token()}
    id = (await client.post("/api/conversations", headers=headers)).json()["conversation_id"]
    other_store = Store(service.config.ai_database_url)
    other_service = ConversationService(
        other_store, saver, FakeParser, service.core_http, service.config
    )
    try:
        async with store.locked(id):
            async with httpx.AsyncClient(
                base_url="http://ai",
                transport=httpx.ASGITransport(app=create_app(other_service, service.config)),
            ) as other:
                response = await other.post(
                    f"/api/conversations/{id}/messages",
                    headers=headers,
                    json={"text": "Mai chơi 2 tiếng", "client_message_id": str(uuid4())},
                )
                assert response.status_code == 409
    finally:
        await other_store.engine.dispose()
