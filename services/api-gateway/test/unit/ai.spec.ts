import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";

const config = {
  coreUrl: "http://core",
  aiUrl: "http://ai",
  jwtSecret: "gateway-ai-unit-private-jwt-key-at-least-32",
  issuer: "badminton-identity",
  audience: "badminton-system",
  origins: [],
  metricsToken: "monitor",
  timeout: 100,
  aiTimeout: 100,
};
const id = "11111111-1111-4111-8111-111111111111";
function token(role = "user") {
  return jwt.sign({ sub: "customer", role }, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: "1h",
    algorithm: "HS256",
  });
}
describe("AI gateway boundary", () => {
  it("forwards proposal acceptance while rejecting IDs used with the wrong action", async () => {
    const transport = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ action: "SEARCH_RESULTS", options: [] }),
          { status: 200 },
        ),
    );
    const server = createApp(config, transport);
    const body = {
      text: "Đồng ý đổi điều kiện",
      client_message_id: "proposal-message-001",
      action: "accept_proposal",
      proposal_id: id,
    };
    await request(server)
      .post(`/api/conversations/${id}/messages`)
      .set("Authorization", "Bearer " + token())
      .send(body)
      .expect(200);
    expect(
      JSON.parse(
        (transport.mock.calls[0] as unknown as [string, RequestInit])[1]
          .body as string,
      ),
    ).toEqual(body);
    for (const invalid of [
      { ...body, action: "select" },
      { ...body, proposal_id: undefined },
      { ...body, confirmation_id: id },
    ]) {
      await request(server)
        .post(`/api/conversations/${id}/messages`)
        .set("Authorization", "Bearer " + token())
        .send(invalid)
        .expect(400);
    }
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("requires a verified JWT before calling AI", async () => {
    const transport = vi.fn();
    await request(createApp(config, transport))
      .post("/api/conversations")
      .set("X-User-Role", "super_admin")
      .send({})
      .expect(401);
    expect(transport).not.toHaveBeenCalled();
  });
  it("forwards the original bearer and request ID, excluding forged actor headers", async () => {
    const transport = vi.fn(
      async () =>
        new Response(JSON.stringify({ conversation_id: id }), { status: 201 }),
    );
    const bearer = "Bearer " + token();
    await request(createApp(config, transport))
      .post("/api/conversations")
      .set("Authorization", bearer)
      .set("X-User-ID", "intruder")
      .set("X-Request-Id", "ai-test-request-id")
      .send({})
      .expect(201);
    const [url, init] = transport.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://ai/api/conversations");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: bearer,
      "X-Request-Id": "ai-test-request-id",
    });
    expect(init.redirect).toBe("error");
  });
  it("rejects authority fields, malformed option IDs and arbitrary AI tool paths", async () => {
    const transport = vi.fn();
    const server = createApp(config, transport);
    for (const extra of [
      { userId: "intruder" },
      { option_id: "stale" },
      { tool: "execute_sql" },
    ]) {
      await request(server)
        .post(`/api/conversations/${id}/messages`)
        .set("Authorization", "Bearer " + token())
        .send({ text: "đặt sân", client_message_id: "message-001", ...extra })
        .expect(400);
    }
    await request(server)
      .post("/api/ai/tools/execute_sql")
      .set("Authorization", "Bearer " + token())
      .send({})
      .expect(404);
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves owner/conflict failures and masks network details without automatic retry", async () => {
    const refused = vi.fn(
      async () =>
        new Response(JSON.stringify({ detail: "Không tìm thấy hội thoại" }), {
          status: 404,
        }),
    );
    await request(createApp(config, refused))
      .get(`/api/conversations/${id}`)
      .set("Authorization", "Bearer " + token())
      .expect(404);
    const failed = vi.fn(async () => {
      throw new TypeError("private-network-address");
    });
    const response = await request(createApp(config, failed))
      .post(`/api/conversations/${id}/messages`)
      .set("Authorization", "Bearer " + token())
      .send({ text: "xác nhận đặt sân", client_message_id: "message-002" })
      .expect(502);
    expect(response.text).not.toContain("private-network-address");
    expect(failed).toHaveBeenCalledTimes(1);
  });
});

it("keeps cancellation consent separate and forwards only the server-issued nonce", async () => {
  const transport = vi.fn(
    async () =>
      new Response(JSON.stringify({ action: "BOOKING_CANCELLED" }), {
        status: 200,
      }),
  );
  const server = createApp(config, transport);
  const body = {
    text: "Xác nhận hủy booking",
    client_message_id: "cancel-message-001",
    action: "confirm_cancellation",
    cancellation_id: id,
  };
  await request(server)
    .post(`/api/conversations/${id}/messages`)
    .set("Authorization", "Bearer " + token())
    .send(body)
    .expect(200);
  for (const invalid of [
    { ...body, cancellation_id: undefined },
    { ...body, action: "confirm" },
    { ...body, confirmation_id: id },
    { ...body, booking_choice_id: id },
    {
      text: "Chọn booking",
      client_message_id: "choose-message",
      action: "select_booking",
    },
  ]) {
    await request(server)
      .post(`/api/conversations/${id}/messages`)
      .set("Authorization", "Bearer " + token())
      .send(invalid)
      .expect(400);
  }
  expect(transport).toHaveBeenCalledTimes(1);
});
