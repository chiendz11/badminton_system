import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Telemetry } from "./telemetry";
export function createRequestTelemetryMiddleware(telemetry: Telemetry) {
  return (
    req: Request & { requestId: string; actor?: { userId: string } },
    res: Response,
    next: () => void,
  ) => {
    const requested = req.headers["x-request-id"];
    const requestId =
      typeof requested === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(requested)
        ? requested
        : randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    const began = process.hrtime.bigint();
    res.on("finish", () => {
      const route =
        typeof req.route?.path === "string" ? req.route.path : "<unmatched>";
      if (route === "/metrics") return;
      const elapsed = Number(process.hrtime.bigint() - began) / 1e9;
      const labels = {
        method: [
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "OPTIONS",
          "HEAD",
        ].includes(req.method)
          ? req.method
          : "OTHER",
        route,
        status: String(res.statusCode),
      };
      telemetry.metrics.requests.inc(labels);
      telemetry.metrics.duration.observe(labels, elapsed);
      telemetry.logger.info(
        {
          requestId,
          actorId: req.actor?.userId,
          method: labels.method,
          route,
          status: res.statusCode,
          durationMs: Math.round(elapsed * 1000),
        },
        "http.request",
      );
    });
    telemetry.context.run({ requestId }, next);
  };
}
