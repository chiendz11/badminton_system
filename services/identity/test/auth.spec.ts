import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app";
import { authRouter, type AuthUser, type UserStore } from "../src/auth";
import { registrationRouter, type PendingRegistration } from "../src/registration";
import { emailVerificationRouter } from "../src/email-verification";
import { mailpitSender } from "../src/mailpit";
const config = { port: 8084, databaseUrl: "postgresql://localhost/test", jwtSecret: "test-secret-at-least-32-characters-long", issuer: "badminton-identity", audience: "badminton-system", secureRefreshCookie: false };
let user: AuthUser;
beforeAll(async () => { user = { id: "ba0d0000-0000-4000-8000-000000000001", email: "dung@example.com", passwordHash: await hash("example-password", 4), role: "user", isActive: true, profile: { name: "Dung" } }; });
function app(
  current: AuthUser | null = user,
  createSession: UserStore["createSession"] = async () => {},
  authConfig = config,
  rotateSession: UserStore["rotateSession"] = async () => null,
  revokeSession: UserStore["revokeSession"] = async () => {},
) {
  return createApp(async () => {}, authRouter({
    byEmail: async (email) => email === current?.email ? current : null,
    byId: async (id) => id === current?.id ? current : null,
    createSession,
    rotateSession,
    revokeSession,
  }, authConfig));
}
const login = (a: ReturnType<typeof app>, password = "example-password") => request(a).post("/api/auth/login").send({ email: "DUNG@example.com", password });
describe("identity authentication", () => {
  it.each(["super_admin", "center_manager"] as const)(
    "uses the stored %s role for login and me",
    async (role) => {
      const a = app({ ...user, role });
      const result = await request(a)
        .post("/api/auth/login")
        .send({
          email: user.email,
          password: "example-password",
          role: "user",
        });
      expect(result.status).toBe(200);
      expect(result.body.profile.role).toBe(role);
      const claims = jwt.verify(
        result.body.accessToken,
        config.jwtSecret,
      ) as jwt.JwtPayload;
      expect(claims.role).toBe(role);
      const me = await request(a)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${result.body.accessToken}`);
      expect(me.body.profile.role).toBe(role);
    },
  );
  it("does not accept a client-supplied administrator role", async () => {
    const result = await request(app())
      .post("/api/auth/login")
      .send({
        email: user.email,
        password: "example-password",
        role: "super_admin",
      });
    expect(result.status).toBe(200);
    expect(result.body.profile.role).toBe("user");
  });

  it("issues gateway-compatible claims and returns only public fields", async () => {
    const a = app(); const response = await login(a); expect(response.status).toBe(200);
    const payload = jwt.verify(response.body.accessToken, config.jwtSecret, { algorithms: ["HS256"], issuer: config.issuer, audience: config.audience }) as jwt.JwtPayload;
    expect(payload.sub).toBe(user.id); expect(payload.role).toBe("user"); expect(payload.exp! - payload.iat!).toBe(900);
    expect(response.body.profile.passwordHash).toBeUndefined();
    const me = await request(a).get("/api/auth/me").set("Authorization", `Bearer ${response.body.accessToken}`);
    expect(me.status).toBe(200); expect(me.body.profile.userId).toBe(user.id);
  });
  it("persists a hashed refresh token and issues the raw token only in a secure cookie", async () => {
    const createSession = vi.fn<UserStore["createSession"]>().mockResolvedValue(undefined);
    const before = Date.now();
    const result = await login(app(user, createSession, { ...config, secureRefreshCookie: true }));
    expect(result.status).toBe(200);
    const cookies: unknown = result.headers["set-cookie"];
    const [cookie] = Array.isArray(cookies) ? cookies : [];
    expect(typeof cookie).toBe("string");
    const token = /^refresh_token=([A-Za-z0-9_-]{43});/.exec(cookie)?.[1];
    expect(token).toBeDefined();
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Domain=");
    expect(result.text).not.toContain(token!);
    expect(createSession).toHaveBeenCalledExactlyOnceWith(
      user.id,
      createHash("sha256").update(token!).digest("hex"),
      expect.any(Date),
    );
    const expiresAt = createSession.mock.calls[0][2];
    const lifetime = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + lifetime);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + lifetime);
  });

  it("creates no session on invalid credentials and sets no cookie when persistence fails", async () => {
    const createSession = vi.fn<UserStore["createSession"]>().mockRejectedValue(Error("database unavailable"));
    const server = app(user, createSession);
    const denied = await login(server, "wrong");
    expect(denied.status).toBe(401);
    expect(denied.headers["set-cookie"]).toBeUndefined();
    expect(createSession).not.toHaveBeenCalled();

    const failed = await login(server);
    expect(failed.status).toBe(500);
    expect(failed.headers["set-cookie"]).toBeUndefined();
    expect(failed.body.accessToken).toBeUndefined();
  });

  it("rejects wrong password, unknown email, and inactive accounts uniformly", async () => {
    const bad = await login(app(), "wrong"); const missing = await login(app(null)); const inactive = await login(app({ ...user, isActive: false }));
    for (const response of [bad, missing, inactive]) { expect(response.status).toBe(401); expect(response.body).toEqual(bad.body); }
  });
  it("rejects invalid input and malformed JSON", async () => {
    expect((await request(app()).post("/api/auth/login").send({ email: {}, password: "x" })).status).toBe(400);
    expect((await request(app()).post("/api/auth/login").set("Content-Type", "application/json").send('{')).status).toBe(400);
  });
  it("rejects missing, expired, wrong audience and wrong signature tokens", async () => {
    const a = app(); expect((await request(a).get("/api/auth/me")).status).toBe(401);
    for (const overrides of [{ expiresIn: -1 }, { audience: "other" }, { algorithm: "HS384" as const }]) {
      const token = jwt.sign({ role: "user" }, config.jwtSecret, { subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: 900, ...overrides });
      expect((await request(a).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
    }
    const token = jwt.sign({ role: "user" }, "wrong-secret", { subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: 900 });
    expect((await request(a).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });
  it("checks current account status on me", async () => {
    const result = await login(app());
    expect((await request(app({ ...user, isActive: false })).get("/api/auth/me").set("Authorization", `Bearer ${result.body.accessToken}`)).status).toBe(401);
  });
  it("limits repeated login attempts", async () => {
    const a = app(); for (let i=0;i<20;i++) await request(a).post("/api/auth/login").send({});
    expect((await request(a).post("/api/auth/login").send({})).status).toBe(429);
  });
});


describe("identity refresh", () => {
  const refreshToken = Buffer.alloc(32, 4).toString("base64url");

  it("rotates the cookie and issues an access token using the current profile", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const rotate = vi.fn<UserStore["rotateSession"]>().mockResolvedValue({
      user: { id: user.id, email: user.email, role: "center_manager", profile: { name: "Current Name" } },
      expiresAt,
    });
    const result = await request(app(user, undefined, config, rotate))
      .post("/api/auth/refresh")
      .set("Cookie", "unrelated=value; refresh_token=" + refreshToken)
      .expect(200)
      .expect("Cache-Control", "no-store");
    const cookies: unknown = result.headers["set-cookie"];
    const [cookie] = Array.isArray(cookies) ? cookies : [];
    const replacement = /^refresh_token=([A-Za-z0-9_-]{43});/.exec(cookie)?.[1];
    expect(replacement).toBeDefined();
    expect(replacement).not.toBe(refreshToken);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Expires=" + expiresAt.toUTCString());
    expect(result.text).not.toContain(replacement!);
    expect(rotate).toHaveBeenCalledExactlyOnceWith(
      createHash("sha256").update(refreshToken).digest("hex"),
      createHash("sha256").update(replacement!).digest("hex"),
    );
    expect(result.body.expiresIn).toBe(900);
    expect(result.body.profile).toMatchObject({ role: "center_manager", name: "Current Name" });
    expect(jwt.verify(result.body.accessToken, config.jwtSecret)).toMatchObject({
      sub: user.id,
      role: "center_manager",
      name: "Current Name",
    });
  });

  it.each([
    "unrelated=value",
    "refresh_token=short",
    "refresh_token=" + refreshToken + "; refresh_token=" + refreshToken,
  ])("rejects missing, malformed, and ambiguous refresh cookies", async (cookies) => {
    const rotate = vi.fn<UserStore["rotateSession"]>();
    const result = await request(app(user, undefined, config, rotate))
      .post("/api/auth/refresh")
      .set("Cookie", cookies)
      .expect(401);
    expect(rotate).not.toHaveBeenCalled();
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(result.body).toEqual({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  });

  it("returns the same error when the store rejects a token", async () => {
    const rotate = vi.fn<UserStore["rotateSession"]>().mockResolvedValue(null);
    const result = await request(app(user, undefined, config, rotate))
      .post("/api/auth/refresh")
      .set("Cookie", "refresh_token=" + refreshToken)
      .expect(401);
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(result.body).toEqual({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  });
});

describe("identity logout", () => {
  const token = Buffer.alloc(32, 5).toString("base64url");

  it("revokes the session by hash and expires the scoped cookie", async () => {
    const revoke = vi.fn<UserStore["revokeSession"]>().mockResolvedValue(undefined);
    const result = await request(app(user, undefined, { ...config, secureRefreshCookie: true }, undefined, revoke))
      .post("/api/auth/logout")
      .set("Cookie", "refresh_token=" + token)
      .expect(204)
      .expect("Cache-Control", "no-store");
    expect(result.text).toBe("");
    expect(revoke).toHaveBeenCalledExactlyOnceWith(createHash("sha256").update(token).digest("hex"));
    const cookies: unknown = result.headers["set-cookie"];
    const [cookie] = Array.isArray(cookies) ? cookies : [];
    expect(cookie).toMatch(/^refresh_token=;/);
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
  });

  it("returns the same 204 and clears the cookie for an absent or unknown token", async () => {
    const revoke = vi.fn<UserStore["revokeSession"]>().mockResolvedValue(undefined);
    const server = app(user, undefined, config, undefined, revoke);
    const missing = await request(server).post("/api/auth/logout").expect(204);
    expect(revoke).not.toHaveBeenCalled();
    const unknown = await request(server)
      .post("/api/auth/logout")
      .set("Cookie", "refresh_token=" + token)
      .expect(204);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(missing.headers["set-cookie"]).toEqual(unknown.headers["set-cookie"]);
    expect(unknown.text).toBe("");
  });

  it("keeps the cookie available for retry if revocation fails", async () => {
    const revoke = vi.fn<UserStore["revokeSession"]>().mockRejectedValue(Error("database unavailable"));
    const result = await request(app(user, undefined, config, undefined, revoke))
      .post("/api/auth/logout")
      .set("Cookie", "refresh_token=" + token)
      .expect(500);
    expect(result.headers["set-cookie"]).toBeUndefined();
  });
});

describe("identity registration", () => {
  const details = {
    email: "NEW@example.com",
    username: " New User ",
    password: "LocalPass1!a",
  };

  function registrationApp(...args: Parameters<typeof registrationRouter>) {
    return createApp(async () => {}, registrationRouter(...args));
  }

  it("passes only hashed credentials and normalized fields to storage", async () => {
    const register = vi.fn(async (_registration: PendingRegistration) => ({ id: "new-user" }));
    const send = vi.fn(async (_email: string, _token: string) => true);
    const response = await request(registrationApp(register, send))
      .post("/api/auth/register")
      .send({ ...details, role: "super_admin", isVerified: true });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      userId: "new-user",
      role: "user",
      isVerified: false,
      verificationEmailSent: true,
    });
    const [registration] = register.mock.calls[0];
    expect(registration.email).toBe("new@example.com");
    expect(registration.name).toBe("New User");
    expect(await compare(details.password, registration.passwordHash)).toBe(true);
    expect(registration.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(registration.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(registration).not.toHaveProperty("token");
    expect(send).toHaveBeenCalledTimes(1);
    const [recipient, token] = send.mock.calls[0];
    expect(recipient).toBe(registration.email);
    expect(createHash("sha256").update(token).digest("hex")).toBe(registration.tokenHash);
    expect(response.text).not.toContain(token);
  });

  it.each([
    ["email with leading whitespace", { email: " NEW@example.com" }],
    ["email with trailing whitespace", { email: "NEW@example.com " }],
    ["email with embedded whitespace", { email: "NEW USER@example.com" }],
    ["password with whitespace", { password: "Local pass1word!" }],
    ["short password", { password: "Aa1!" }],
    ["short password with supplementary Unicode characters", { password: "Aa1!" + "🙂".repeat(4) }],
    ["password without uppercase", { password: "local-password1!" }],
    ["password without lowercase", { password: "LOCAL-PASSWORD1!" }],
    ["password without a digit", { password: "Local-password!" }],
    ["password without special characters", { password: "LocalPassword1" }],
    ["password beyond the UTF-8 limit", { password: "Aa1!" + "é".repeat(35) }],
  ])("rejects %s before calling storage", async (_case, invalidFields) => {
    const register = vi.fn();
    const response = await request(registrationApp(register))
      .post("/api/auth/register")
      .send({ ...details, ...invalidFields });

    expect(response.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it("returns a conflict when the email is already registered", async () => {
    const send = vi.fn();
    const response = await request(registrationApp(async () => null, send))
      .post("/api/auth/register")
      .send(details);

    expect(response.status).toBe(409);
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps the pending account when the inbox is unavailable", async () => {
    const send = vi.fn(async () => false);
    const response = await request(registrationApp(async () => ({ id: "pending-user" }), send))
      .post("/api/auth/register")
      .send(details);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      userId: "pending-user",
      role: "user",
      isVerified: false,
      verificationEmailSent: false,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("identity email verification", () => {
  const token = Buffer.alloc(32, 1).toString("base64url");

  function verificationApp(verifyEmail: Parameters<typeof emailVerificationRouter>[0]) {
    return createApp(async () => {}, authRouter({
      byEmail: async () => null,
      byId: async () => null,
      createSession: async () => {},
      rotateSession: async () => null,
      revokeSession: async () => {},
    }, config).use(emailVerificationRouter(verifyEmail)));
  }

  it("verifies by hash and returns no credentials", async () => {
    const verifyEmail = vi.fn(async () => true);
    const response = await request(verificationApp(verifyEmail))
      .post("/api/auth/verify-email")
      .send({ token });

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(verifyEmail).toHaveBeenCalledExactlyOnceWith(
      createHash("sha256").update(token).digest("hex"),
    );
  });

  it.each([undefined, {}, "short", "!".repeat(43), token + "\n"])(
    "rejects malformed tokens before calling storage",
    async (badToken) => {
      const verifyEmail = vi.fn(async () => true);
      const response = await request(verificationApp(verifyEmail))
        .post("/api/auth/verify-email")
        .send({ token: badToken });

      expect(response.status).toBe(400);
      expect(verifyEmail).not.toHaveBeenCalled();
    },
  );

  it("returns a generic error when the token cannot be claimed", async () => {
    const response = await request(verificationApp(async () => false))
      .post("/api/auth/verify-email")
      .send({ token });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Link xác minh không hợp lệ hoặc đã hết hạn" });
  });
});

describe("identity resend email verification", () => {
  const email = "customer@example.test";
  const token = Buffer.alloc(32, 3).toString("base64url");

  function resendApp(resend?: Parameters<typeof emailVerificationRouter>[1]) {
    return createApp(async () => {}, authRouter({
      byEmail: async () => null,
      byId: async () => null,
      createSession: async () => {},
      rotateSession: async () => null,
      revokeSession: async () => {},
    }, config).use(emailVerificationRouter(async () => false, resend)));
  }

  it("normalizes email and sends a fresh link without returning the token", async () => {
    const reissue = vi.fn(async () => token);
    const send = vi.fn(async () => true);
    const response = await request(resendApp({ reissue, send }))
      .post("/api/auth/resend-verification")
      .send({ email: email.toUpperCase() });

    expect(response.status).toBe(202);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ message: "Nếu tài khoản đang chờ xác minh, hãy kiểm tra hộp thư." });
    expect(response.text).not.toContain(token);
    expect(reissue).toHaveBeenCalledExactlyOnceWith(email);
    await vi.waitFor(() => expect(send).toHaveBeenCalledExactlyOnceWith(email, token));
  });

  it("returns the same response when no token is issued or mail is unavailable", async () => {
    const reissue = vi.fn(async () => null);
    const send = vi.fn(async () => true);
    const skipped = await request(resendApp({ reissue, send }))
      .post("/api/auth/resend-verification")
      .send({ email });
    const unconfigured = await request(resendApp())
      .post("/api/auth/resend-verification")
      .send({ email });

    expect(skipped.status).toBe(202);
    expect(unconfigured.status).toBe(202);
    expect(skipped.body).toEqual(unconfigured.body);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects malformed email before looking up an account", async () => {
    const reissue = vi.fn(async () => token);
    const send = vi.fn(async () => true);
    await request(resendApp({ reissue, send }))
      .post("/api/auth/resend-verification")
      .send({ email: " " + email })
      .expect(400);

    expect(reissue).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("Mailpit verification email", () => {
  const config = {
    origin: new URL("http://mailpit:8025"),
    verificationPage: new URL("http://localhost:8082/verify-email"),
  };

  it("sends the verification link to the inbox API", async () => {
    const sendRequest = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    const send = mailpitSender(config, sendRequest);
    const token = Buffer.alloc(32, 2).toString("base64url");

    await expect(send("customer@example.test", token)).resolves.toBe(true);
    const [url, options] = sendRequest.mock.calls[0];
    expect(String(url)).toBe("http://mailpit:8025/api/v1/send");
    expect(options).toMatchObject({ method: "POST", redirect: "error" });
    expect(JSON.parse(String(options?.body))).toMatchObject({
      From: { Email: "noreply@badminton.local" },
      To: [{ Email: "customer@example.test" }],
      Text: expect.stringContaining("http://localhost:8082/verify-email#token=" + token),
    });
  });

  it("reports network errors and rejected messages as undelivered", async () => {
    const sendRequest = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const send = mailpitSender(config, sendRequest);

    await expect(send("customer@example.test", "test-token")).resolves.toBe(false);
    await expect(send("customer@example.test", "test-token")).resolves.toBe(false);
  });
});
