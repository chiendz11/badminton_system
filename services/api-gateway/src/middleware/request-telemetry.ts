import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { createLogger } from "@badminton/observability";
import { Counter, Histogram, Registry } from "prom-client";
export function telemetry() {
  const logger = createLogger(undefined, "api-gateway"),
    registry = new Registry(),
    requests = new Counter({
      name: "api_gateway_http_requests_total",
      help: "Completed gateway requests",
      labelNames: ["method", "route", "status"],
      registers: [registry],
    }),
    duration = new Histogram({
      name: "api_gateway_http_duration_seconds",
      help: "Gateway request latency",
      labelNames: ["method", "route", "status"],
      registers: [registry],
    });
  const middleware: RequestHandler = (req, res, next) => {
    const candidate = req.get("x-request-id");
    req.requestId =
      candidate && /^[A-Za-z0-9_-]{8,64}$/.test(candidate)
        ? candidate
        : randomUUID();
    res.set("X-Request-Id", req.requestId);
    const start = performance.now();
    res.on("finish", () => {
      const route = req.route?.path || "unmatched",
        status = String(res.statusCode);
      requests.inc({ method: req.method, route, status });
      duration.observe(
        { method: req.method, route, status },
        (performance.now() - start) / 1000,
      );
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          route,
          status: res.statusCode,
          durationMs: performance.now() - start,
        },
        "request_completed",
      );
    });
    next();
  };
  return { logger, registry, middleware };
}
