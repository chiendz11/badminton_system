import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app";
import { authRouter, type AuthUser } from "../src/auth";
const config = { port: 8084, databaseUrl: "postgresql://localhost/test", jwtSecret: "test-secret-at-least-32-characters-long", issuer: "badminton-identity", audience: "badminton-system" };
let user: AuthUser;
beforeAll(async () => { user = { id: "ba0d0000-0000-4000-8000-000000000001", email: "dung@example.com", passwordHash: await hash("example-password", 4), role: "user", isActive: true, profile: { name: "Dung" } }; });
function app(current: AuthUser | null = user) { return createApp(async () => {}, authRouter({ byEmail: async email => email === current?.email ? current : null, byId: async id => id === current?.id ? current : null }, config)); }
const login = (a: ReturnType<typeof app>, password = "example-password") => request(a).post("/api/auth/login").send({ email: "DUNG@example.com", password });
describe("identity authentication", () => {
  it("issues gateway-compatible claims and returns only public fields", async () => {
    const a = app(); const response = await login(a); expect(response.status).toBe(200);
    const payload = jwt.verify(response.body.accessToken, config.jwtSecret, { algorithms: ["HS256"], issuer: config.issuer, audience: config.audience }) as jwt.JwtPayload;
    expect(payload.sub).toBe(user.id); expect(payload.role).toBe("user"); expect(payload.exp! - payload.iat!).toBe(900);
    expect(response.body.profile.passwordHash).toBeUndefined();
    const me = await request(a).get("/api/auth/me").set("Authorization", `Bearer ${response.body.accessToken}`);
    expect(me.status).toBe(200); expect(me.body.profile.userId).toBe(user.id);
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
