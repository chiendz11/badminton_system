import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
import { BookingCoreClient } from "../../src/clients/booking-core.client";
const config = {
  coreUrl: "http://core",
  jwtSecret: "gateway-unit-private-jwt-key-at-least-32",
  issuer: "badminton-identity",
  audience: "badminton-system",
  origins: ["http://allowed"],
  metricsToken: "monitor",
  timeout: 100,
};
const app = () =>
  createApp(
    config,
    async () => new Response(JSON.stringify({ status: "ready" })),
  );
describe("gateway boundaries", () => {
  it("ignores forged actor headers and excludes non-booking routes", async () => {
    await request(app())
      .post("/api/booking/pending/pendingBookingToDB")
      .set("X-User-ID", "admin")
      .set("X-User-Role", "super_admin")
      .send({})
      .expect(401);
    for (const path of [
      "/api/auth/login",
      "/api/news",
      "/api/booking/pass-booking/list",
      "/api/booking/payment/create-link",
    ])
      await request(app()).get(path).expect(404);
  });
  it("allows only configured browser origins, including same-origin reverse proxy requests", async () => {
    await request(app())
      .get("/health/live")
      .set("Origin", "http://allowed")
      .expect(200);
    await request(app())
      .get("/health/live")
      .set("Origin", "https://untrusted.example")
      .expect(403);
  });
  it("requires issuer/audience/expiry on business tokens", async () => {
    const token = jwt.sign({ sub: "customer", role: "user" }, config.jwtSecret);
    await request(app())
      .get("/api/user/me/statistics")
      .set("Authorization", "Bearer " + token)
      .expect(401);
  });
  it("protects metrics separately from the business JWT and labels unknown routes without IDs", async () => {
    const server = app();
    await request(server).get("/metrics").expect(401);
    await request(server).get("/unknown-unique-id").expect(404);
    const response = await request(server)
      .get("/metrics")
      .set("Authorization", "Bearer monitor")
      .expect(200);
    expect(response.text).toContain('route="unmatched"');
    expect(response.text).not.toContain("unknown-unique-id");
  });
  it("forwards only the bearer, request ID and idempotency key", async () => {
    let sent: any;
    const client = new BookingCoreClient(config, async (_url, options) => {
      sent = options;
      return new Response("{}");
    });
    await client.call(
      {
        headers: {
          authorization: "Bearer valid",
          "x-user-role": "super_admin",
        } as any,
        requestId: "correlation",
      },
      "/api/v1/reservations",
      "POST",
      {},
      "request-id",
    );
    expect(sent.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer valid",
      "X-Request-Id": "correlation",
      "Idempotency-Key": "request-id",
    });
  });
  it("maps upstream failures without exposing internal network errors", async () => {
    const client = new BookingCoreClient(config, async () => {
      throw new TypeError("private-host-error");
    });
    await expect(
      client.call({ headers: {}, requestId: "r" }, "/health/ready"),
    ).rejects.toMatchObject({
      status: 502,
      message: "Booking Core không sẵn sàng",
    });
  });
  it("rejects empty GraphQL requests, recursive/expanded fragments and batched mutations", async () => {
    await request(app()).post("/graphql").expect(400);
    for (const query of [
      "{ ...Loop } fragment Loop on Query { ...Loop }",
      "{ ...A ...A } fragment A on Query { ...B ...B } fragment B on Query { ...C ...C } fragment C on Query { ...D ...D } fragment D on Query { ...E ...E } fragment E on Query { ...F ...F } fragment F on Query { ...G ...G } fragment G on Query { centers {name} }",
      'mutation { ...Writes } fragment Writes on Mutation { a:deleteCenter(centerId:"11111111-1111-4111-8111-111111111111") b:deleteCenter(centerId:"11111111-1111-4111-8111-111111111111") }',
    ])
      await request(app()).post("/graphql").send({ query }).expect(400);
  });
  it("bounds GraphQL depth, rejects malformed queries, and rejects unauthorized mutations", async () => {
    await request(app()).post("/graphql").send({ query: "{" }).expect(400);
    const response = await request(app())
      .post("/graphql")
      .send({
        query:
          'mutation { deleteCenter(centerId:"11111111-1111-4111-8111-111111111111") }',
      })
      .expect(200);
    expect(response.body.errors[0].extensions.code).toBe(401);
  });
});
