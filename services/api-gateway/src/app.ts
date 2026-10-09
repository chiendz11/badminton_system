import express from "express";
import cors from "cors";
import helmet from "helmet";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { configuration, type GatewayConfig } from "./configs/environment";
import { BookingCoreClient } from "./clients/booking-core.client";
import { authenticate } from "./middleware/authenticate.middleware";
import { GatewayError } from "./middleware/http-errors";
import { telemetry } from "./middleware/request-telemetry";
import { aiRoutes } from "./routes/ai.route";
import { bookingRoutes } from "./routes/booking.route";
import { BookingAdapter } from "./modules/booking/booking-adapter";
import { CenterAdapter } from "./modules/centers/center-adapter";
import { graphqlMiddleware } from "./graphql.setup";
export function createApp(
  config: GatewayConfig = configuration(),
  transport: typeof fetch = fetch,
) {
  const app = express(),
    core = new BookingCoreClient(config, transport),
    monitor = telemetry();
  app.disable("x-powered-by");
  app.use(monitor.middleware, helmet());
  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) =>
        callback(
          origin && !config.origins.includes(origin)
            ? new GatewayError(403, "Origin không được phép")
            : null,
          true,
        ),
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "Idempotency-Key",
        "x-client-id",
      ],
      exposedHeaders: ["X-Request-Id"],
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.get("/health/live", (_req, res) => res.json({ status: "live" }));
  app.get("/health/ready", async (req, res) => {
    await core.call(req, "/health/ready");
    res.json({ status: "ready" });
  });
  app.get("/metrics", async (req, res) => {
    const expected = Buffer.from("Bearer " + config.metricsToken),
      actual = Buffer.from(req.get("authorization") || "");
    if (
      !config.metricsToken ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    )
      throw new GatewayError(401, "Cần monitoring token");
    res
      .type(monitor.registry.contentType)
      .send(await monitor.registry.metrics());
  });
  app.use(authenticate(config));
  app.post("/graphql", graphqlMiddleware(new CenterAdapter(core)));
  app.use("/api", aiRoutes(config, transport));
  app.use("/api", bookingRoutes(new BookingAdapter(core)));
  app.use((_req, _res, next) =>
    next(new GatewayError(404, "Route không thuộc Booking Core gateway")),
  );
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        error instanceof GatewayError
          ? error.status
          : error instanceof ZodError || error instanceof SyntaxError
            ? 400
            : error.status === 413
              ? 413
              : 500;
      monitor.logger.error(
        { requestId: req.requestId, status },
        "request_failed",
      );
      res.status(status).json({
        message:
          status === 500
            ? "Lỗi gateway"
            : error instanceof ZodError
              ? "Dữ liệu không hợp lệ"
              : error.message,
        requestId: req.requestId,
      });
    },
  );
  return app;
}
