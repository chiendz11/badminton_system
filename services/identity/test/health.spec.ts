import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { configuration } from "../src/config/environment";

describe("identity health", () => {
  it("keeps liveness available while readiness fails on DB outage", async () => {
    const app = createApp(async () => {
      throw Error("private database credentials");
    });
    expect((await request(app).get("/health")).status).toBe(200);
    const ready = await request(app).get("/health/ready");
    expect(ready.status).toBe(503);
    expect(ready.text).not.toContain("private database credentials");
  });
  it("reports ready only after a successful database probe", async () => {
    let probed = false;
    const app = createApp(async () => {
      probed = true;
    });
    const ready = await request(app).get("/health/ready");
    expect(probed).toBe(true);
    expect(ready.status).toBe(200);
    expect(ready.body.database).toBe("connected");
  });
});
const env = {
  DATABASE_URL: "postgresql://identity:dev@localhost:5434/identity",
  JWT_SECRET: "local-development-only-change-me-32-chars",
};
describe("identity configuration", () => {
  it("uses gateway-compatible defaults", () => {
    expect(configuration(env)).toMatchObject({
      issuer: "badminton-identity",
      audience: "badminton-system",
      port: 8084,
      trustProxy: 1,
      secureRefreshCookie: false,
    });
  });
  it("supports Mailpit, COOKIE_SECURE, and TRUST_PROXY independently of NODE_ENV", () => {
    const prodConfig = configuration({
      ...env,
      NODE_ENV: "production",
      JWT_SECRET: "a-real-production-secret-key-at-least-32-chars",
      MAILPIT_URL: "http://mailpit:8025",
      EMAIL_VERIFICATION_PAGE_URL: "https://web.badminton.local/verify-email",
      COOKIE_SECURE: "false",
      TRUST_PROXY: "2",
    });
    expect(prodConfig.secureRefreshCookie).toBe(false);
    expect(prodConfig.trustProxy).toBe(2);
    expect(prodConfig.mailpit?.origin.href).toBe("http://mailpit:8025/");
    expect(prodConfig.mailpit?.verificationPage.href).toBe(
      "https://web.badminton.local/verify-email",
    );
    expect(configuration({ ...env, COOKIE_SECURE: "true" }).secureRefreshCookie).toBe(true);
    expect(configuration({ ...env, TRUST_PROXY: "false" }).trustProxy).toBe(false);
    expect(() => configuration({ ...env, COOKIE_SECURE: "yes" })).toThrow();
    expect(() => configuration({ ...env, TRUST_PROXY: "invalid" })).toThrow();
  });
  it("rejects incomplete/invalid config and production demo secrets", () => {
    expect(() => configuration({ ...env, JWT_SECRET: "short" })).toThrow();
    expect(() =>
      configuration({ ...env, DATABASE_URL: "mongodb://localhost/db" }),
    ).toThrow();
    expect(() => configuration({ ...env, PORT: "invalid" })).toThrow();
    expect(() => configuration({ ...env, NODE_ENV: "production" })).toThrow();
  });
});
