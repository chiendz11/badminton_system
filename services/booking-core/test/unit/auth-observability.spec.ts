import { createLogger, createMetrics } from "@badminton/observability";
import jwt from "jsonwebtoken";
import { Writable } from "node:stream";
import { demoToken } from "../../src/modules/development/demo-session";
import { verifyActor } from "../../src/common/auth/verify-actor";
import { validateEnvironment } from "../../src/common/config/environment";
const secret = "unit-test-secret-with-at-least-32-characters";
beforeEach(() => {
  process.env.JWT_SECRET = secret;
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://unused/ci";
});
test("verifies identity issuer, audience and canonical role", () => {
  const token = jwt.sign({ role: "user" }, secret, {
    subject: "user-1",
    issuer: "badminton-identity",
    audience: "badminton-system",
  });
  expect(verifyActor(token).userId).toBe("user-1");
  expect(() =>
    verifyActor(jwt.sign({ role: "super_admin" }, "wrong-secret")),
  ).toThrow();
});
test("rejects an expired token, a missing role and unexpected issuer", () => {
  for (const payload of [
    { role: "user", exp: 1 },
    { role: "unknown" },
    { role: "user", iss: "evil" },
  ])
    expect(() => verifyActor(jwt.sign(payload, secret))).toThrow();
});
test("demo sessions cannot be enabled in production", () => {
  process.env.NODE_ENV = "production";
  process.env.ENABLE_DEMO_AUTH = "true";
  expect(() => demoToken("admin")).toThrow();
  expect(() => validateEnvironment()).toThrow("Demo");
  delete process.env.ENABLE_DEMO_AUTH;
});
test("production rejects the committed local example secrets", () => {
  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = "local-development-only-change-me-32-chars";
  process.env.METRICS_TOKEN = "local-monitoring-only";
  expect(() => validateEnvironment()).toThrow("example secrets");
  delete process.env.METRICS_TOKEN;
});
test("redacts credentials while retaining structured request correlation", () => {
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const logger = createLogger(stream);
  logger.info(
    {
      authorization: "Bearer secret-value",
      cookie: "session=abc",
      password: "private",
      requestId: "request-123",
    },
    "http.request",
  );
  const record = JSON.parse(output);
  expect(record.authorization).toBe("[REDACTED]");
  expect(record.password).toBe("[REDACTED]");
  expect(record.requestId).toBe("request-123");
  expect(output).not.toContain("secret-value");
});
test("metrics are scoped to a registry and avoid user/court ID labels", async () => {
  const first = createMetrics(),
    second = createMetrics();
  first.transitions.inc({ action: "confirmed" });
  first.requests.inc({
    method: "GET",
    route: "/api/v1/bookings/:id",
    status: "200",
  });
  const output = await first.registry.metrics();
  expect(output).toContain("booking_core_transitions_total");
  expect(output).not.toContain("userId");
  expect(await second.registry.metrics()).not.toContain('action="confirmed"');
});
