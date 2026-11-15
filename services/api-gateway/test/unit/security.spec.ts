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
  it("forwards only the refresh cookie on successful login", async () => {
    const refreshCookie = "refresh_token=test-token; Path=/api/auth; HttpOnly; SameSite=Lax";
    const server = createApp({ ...config, identityUrl: "http://identity" }, async (url) => {
      expect(url).toBe("http://identity/api/auth/login");
      const headers = new Headers();
      headers.append("Set-Cookie", refreshCookie);
      headers.append("Set-Cookie", "unrelated=test-token");
      return Response.json({ accessToken: "access", expiresIn: 900 }, { headers });
    });

    const result = await request(server).post("/api/auth/login").send({}).expect(200);
    expect(result.headers["set-cookie"]).toEqual([refreshCookie]);
    expect(result.body).toEqual({ accessToken: "access", expiresIn: 900 });
  });

  it("forwards only the refresh cookie and returns the rotated cookie and body", async () => {
    const replacement = "refresh_token=replacement; Path=/api/auth; HttpOnly; SameSite=Lax";
    const auth = { accessToken: "new-access", tokenType: "Bearer", expiresIn: 900 };
    const server = createApp({ ...config, identityUrl: "http://identity" }, async (url, options) => {
      expect(url).toBe("http://identity/api/auth/refresh");
      expect(options?.headers).toEqual({
        "Content-Type": "application/json",
        Cookie: "refresh_token=current",
        "X-Request-Id": "refresh-request",
        "X-Forwarded-For": "203.0.113.10",
      });
      const headers = new Headers();
      headers.append("Set-Cookie", replacement);
      headers.append("Set-Cookie", "unrelated=value");
      return Response.json(auth, { headers });
    });

    const result = await request(server)
      .post("/api/auth/refresh")
      .set("Cookie", "other=value; refresh_token=current; tracking=value")
      .set("Authorization", "Bearer expired-access")
      .set("X-Request-Id", "refresh-request")
      .set("X-Forwarded-For", "203.0.113.10")
      .expect(200)
      .expect("Cache-Control", "no-store");
    expect(result.headers["set-cookie"]).toEqual([replacement]);
    expect(result.body).toEqual(auth);
  });

  it("leaves ambiguous cookies for Identity to reject and returns no cookie on 401", async () => {
    const message = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn";
    const server = createApp(config, async (_url, options) => {
      expect(options?.headers).toMatchObject({ Cookie: "refresh_token=first; refresh_token=second" });
      return Response.json({ message }, {
        status: 401,
        headers: { "Set-Cookie": "refresh_token=unexpected" },
      });
    });

    const result = await request(server)
      .post("/api/auth/refresh")
      .set("Cookie", "refresh_token=first; other=value; refresh_token=second")
      .expect(401);
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(result.body).toEqual({ message });
  });

  it("preserves the cookie deletion header on logout 204", async () => {
    const expired = "refresh_token=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax";
    const server = createApp({ ...config, identityUrl: "http://identity" }, async (url, options) => {
      expect(url).toBe("http://identity/api/auth/logout");
      expect(options?.headers).toMatchObject({ Cookie: "refresh_token=current" });
      const headers = new Headers();
      headers.append("Set-Cookie", expired);
      headers.append("Set-Cookie", "unrelated=value");
      return new Response(null, { status: 204, headers });
    });

    const result = await request(server)
      .post("/api/auth/logout")
      .set("Cookie", "other=value; refresh_token=current")
      .expect(204)
      .expect("Cache-Control", "no-store");
    expect(result.headers["set-cookie"]).toEqual([expired]);
    expect(result.text).toBe("");
  });

  it.each([true, false])(
    "forwards public registration and preserves delivery status %s",
    async (verificationEmailSent) => {
      const body = {
        email: "customer@example.test",
        username: "Test Customer",
        password: "Local-test-password1!",
      };
      const registration = {
        userId: "new-user",
        role: "user",
        isVerified: false,
        verificationEmailSent,
      };
      const server = createApp(
        { ...config, identityUrl: "http://identity" },
        async (url, options) => {
          expect(url).toBe("http://identity/api/auth/register");
          expect(options).toMatchObject({
            method: "POST",
            body: JSON.stringify(body),
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": "registration-request",
            },
          });
          return Response.json(registration, { status: 201 });
        },
      );

      const result = await request(server)
        .post("/api/auth/register")
        .set("X-Request-Id", "registration-request")
        .send(body)
        .expect(201)
        .expect("Cache-Control", "no-store");
      expect(result.body).toEqual(registration);
    },
  );

  it.each([
    { status: 409, message: "Email đã được đăng ký", retryAfter: null },
    { status: 429, message: "Quá nhiều lần đăng ký. Thử lại sau.", retryAfter: "60" },
  ])("preserves Identity registration errors with status $status", async ({ status, message, retryAfter }) => {
    const server = createApp(config, async () =>
      Response.json({ message }, {
        status,
        headers: retryAfter ? { "Retry-After": retryAfter } : {},
      }),
    );

    const result = await request(server)
      .post("/api/auth/register")
      .send({ email: "customer@example.test" })
      .expect(status);
    expect(result.body).toEqual({ message });
    expect(result.headers["retry-after"]).toBe(retryAfter ?? undefined);
  });

  it("forwards public email verification and preserves the empty success response", async () => {
    const body = { token: Buffer.alloc(32, 1).toString("base64url") };
    const server = createApp(
      { ...config, identityUrl: "http://identity" },
      async (url, options) => {
        expect(url).toBe("http://identity/api/auth/verify-email");
        expect(options).toMatchObject({
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "verification-request",
          },
        });
        return new Response(null, { status: 204 });
      },
    );

    const result = await request(server)
      .post("/api/auth/verify-email")
      .set("X-Request-Id", "verification-request")
      .send(body)
      .expect(204)
      .expect("Cache-Control", "no-store");
    expect(result.text).toBe("");
  });

  it.each([
    { status: 400, retryAfter: null },
    { status: 429, retryAfter: "60" },
  ])("preserves Identity verification errors with status $status", async ({ status, retryAfter }) => {
    const message = status === 400
      ? "Link xác minh không hợp lệ hoặc đã hết hạn"
      : "Quá nhiều lần xác minh. Thử lại sau.";
    const server = createApp(config, async () =>
      Response.json({ message }, {
        status,
        headers: retryAfter ? { "Retry-After": retryAfter } : {},
      }),
    );

    const result = await request(server)
      .post("/api/auth/verify-email")
      .send({ token: "example" })
      .expect(status)
      .expect("Cache-Control", "no-store");
    expect(result.body).toEqual({ message });
    expect(result.headers["retry-after"]).toBe(retryAfter ?? undefined);
  });

  it.each([
    { status: 202, message: "Nếu tài khoản đang chờ xác minh, hãy kiểm tra hộp thư.", retryAfter: null },
    { status: 400, message: "Email không hợp lệ", retryAfter: null },
    { status: 429, message: "Quá nhiều lần gửi lại. Thử lại sau.", retryAfter: "60" },
  ])("forwards public resend with status $status", async ({ status, message, retryAfter }) => {
    const body = { email: "customer@example.test" };
    const server = createApp({ ...config, identityUrl: "http://identity" }, async (url, options) => {
      expect(url).toBe("http://identity/api/auth/resend-verification");
      expect(options).toMatchObject({
        method: "POST",
        body: JSON.stringify(body),
        headers: { "X-Request-Id": "resend-request" },
      });
      return Response.json({ message }, {
        status,
        headers: retryAfter ? { "Retry-After": retryAfter } : {},
      });
    });

    const result = await request(server)
      .post("/api/auth/resend-verification")
      .set("X-Request-Id", "resend-request")
      .send(body)
      .expect(status)
      .expect("Cache-Control", "no-store");
    expect(result.body).toEqual({ message });
    expect(result.headers["retry-after"]).toBe(retryAfter ?? undefined);
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
