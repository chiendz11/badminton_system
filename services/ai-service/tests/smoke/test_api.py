from uuid import uuid4

from tests.conftest import SECRET, create, token


async def test_health_metrics_auth_and_no_login_routes(env):
    c = env["client"]
    assert (await c.get("/health/live")).json()["slot_minutes"] == 60
    assert (await c.get("/health/ready")).status_code == 200
    assert (await c.get("/metrics")).status_code == 401
    m = await c.get("/metrics", headers={"Authorization": "Bearer test-monitor"})
    assert m.status_code == 200 and "ai_http_requests_total" in m.text
    assert (await c.post("/api/conversations")).status_code == 401
    assert (await c.post("/api/auth/login")).status_code == 404


async def test_forged_actor_and_invalid_token_are_rejected(env):
    import jwt

    c = env["client"]
    assert (
        await c.post(
            "/api/conversations", headers={"X-User-Id": "customer", "X-User-Role": "super_admin"}
        )
    ).status_code == 401
    forged = jwt.encode({"sub": "customer", "role": "user"}, SECRET, algorithm="HS256")
    assert (
        await c.post("/api/conversations", headers={"Authorization": "Bearer " + forged})
    ).status_code == 401


async def test_message_limits_no_extra_authority_fields(env):
    id = await create(env)
    headers = {"Authorization": "Bearer " + token()}
    r = await env["client"].post(
        "/api/conversations/" + id + "/messages",
        headers=headers,
        json={"text": "đặt", "client_message_id": str(uuid4()), "userId": "forged"},
    )
    assert r.status_code == 422
    r = await env["client"].post(
        "/api/conversations/" + id + "/messages",
        headers=headers,
        json={"text": "x" * 9000, "client_message_id": str(uuid4())},
    )
    assert r.status_code == 413
