import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
const config = {
  coreUrl: "http://core",
  identityUrl: "http://identity",
  jwtSecret: "gateway-unit-secret-at-least-32-characters",
  issuer: "badminton-identity",
  audience: "badminton-system",
  origins: [],
  metricsToken: "monitor",
  timeout: 100,
};
const token = jwt.sign({ role: "super_admin" }, config.jwtSecret, {
  subject: "ba0d0000-0000-4000-8000-000000000001",
  issuer: config.issuer,
  audience: config.audience,
  expiresIn: 900,
});
describe("identity management proxy", () => {
  it.each([
    ["get", "/me", undefined],
    ["patch", "/me", { name: "Customer" }],
    ["get", "/users?role=center_manager&isActive=true", undefined],
    [
      "patch",
      "/users/ba0d0000-0000-4000-8000-000000000002/status",
      { isActive: false, reason: "Violation" },
    ],
    [
      "put",
      "/users/ba0d0000-0000-4000-8000-000000000002/role",
      { role: "center_manager", reason: "Approved" },
    ],
    [
      "put",
      "/center-assignments",
      { userId: "manager", centerId: "center", active: true },
    ],
  ] as const)(
    "forwards %s %s with its method, body and current authorization",
    async (method, path, body) => {
      const transport = vi.fn(
        async (_url, _options) =>
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      const server = createApp(config, transport);
      let call = request(server)
        [method]("/api/identity" + path)
        .auth(token, { type: "bearer" })
        .set("x-internal-token", "forged");
      if (body) call = call.send(body);
      await call.expect(200).expect("Cache-Control", "no-store");
      expect(transport).toHaveBeenCalledWith(
        "http://identity/api/v1" + path,
        expect.objectContaining({
          method: method.toUpperCase(),
          headers: expect.objectContaining({
            Authorization: "Bearer " + token,
          }),
          body: body ? JSON.stringify(body) : undefined,
        }),
      );
      expect(transport.mock.calls[0][1].headers).not.toHaveProperty(
        "x-internal-token",
      );
    },
  );
  it("requires authentication and never forwards internal routes", async () => {
    const transport = vi.fn(async () => new Response("{}"));
    const server = createApp(config, transport);
    await request(server).get("/api/identity/users").expect(401);
    for (const path of [
      "/internal/identity/users/test",
      "/api/identity/internal/identity/users/test",
      "/api/identity/metrics",
    ]) {
      await request(server)
        .get(path)
        .auth(token, { type: "bearer" })
        .expect(404);
    }
    expect(transport).not.toHaveBeenCalled();
  });
});
