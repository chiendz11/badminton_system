import express, { type ErrorRequestHandler, type Router } from "express";
import helmet from "helmet";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { tokenMatches } from "./access";

export function createApp(
  checkDatabase: () => Promise<void>,
  auth?: Router,
  trustProxy: number | false = 1,
  metricsToken?: string,
  management?: Router,
) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(helmet());
  const registry = new Registry();
  registry.setDefaultLabels({ service: "identity-service" });
  collectDefaultMetrics({ register: registry });
  const requests = new Counter({ name: "identity_http_requests_total", help: "Completed HTTP requests",
    labelNames: ["method", "route", "status"], registers: [registry] });
  const duration = new Histogram({ name: "identity_http_duration_seconds", help: "HTTP request duration",
    labelNames: ["method", "route", "status"], registers: [registry] });
  app.use((req, res, next) => {
    const started = process.hrtime.bigint();
    res.once("finish", () => {
      const labels = { method: req.method, route: req.route?.path ?? "unmatched", status: String(res.statusCode) };
      requests.inc(labels);
      duration.observe(labels, Number(process.hrtime.bigint() - started) / 1e9);
    });
    next();
  });
  app.get("/health/live", (_req, res) => res.json({ status: "live" }));
  app.get("/metrics", async (req, res) => {
    const authorization = req.get("authorization");
    if (!tokenMatches(authorization, metricsToken ? "Bearer " + metricsToken : undefined)) {
      res.status(401).json({ message: "Cần monitoring token" });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.type(registry.contentType).send(await registry.metrics());
  });
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "identity" });
  });
  app.get("/health/ready", async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: "ready", service: "identity", database: "connected" });
    } catch {
      // Never return DB URLs, passwords or driver details to the caller.
      res
        .status(503)
        .json({
          status: "not_ready",
          service: "identity",
          database: "unavailable",
        });
    }
  });
  if (auth) app.use("/api/auth", auth);
  if (management) app.use(management);
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : 500;
    res.status(status).json({ message: status === 500 ? "Lỗi hệ thống" : "Dữ liệu yêu cầu không hợp lệ" });
  };
  app.use(handleError);
  app.use((_req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
  });
  return app;
}
