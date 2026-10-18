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
    });
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
