import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import { Telemetry } from "./telemetry";
@Catch()
class ErrorFilter implements ExceptionFilter {
  constructor(private readonly telemetry: Telemetry) {}
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp(),
      req = context.getRequest<Request & { requestId: string }>(),
      res = context.getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body =
      error instanceof HttpException
        ? error.getResponse()
        : { message: "Lỗi hệ thống, vui lòng thử lại" };
    if (status >= 500)
      this.telemetry.logger.error(
        { err: error, requestId: req.requestId },
        "request.failed",
      );
    res.status(status).json({
      statusCode: status,
      message:
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
            ? body.message
            : "Yêu cầu không hợp lệ",
      requestId: req.requestId,
    });
  }
}
export function configureHttp(app: INestApplication) {
  const telemetry = app.get(Telemetry);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new ErrorFilter(telemetry));
  const origins = new Set(
    (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allowed: boolean) => void,
    ) => callback(null, !origin || origins.has(origin)),
    exposedHeaders: ["X-Request-Id"],
  });
  app.use(
    (
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
    },
  );
}
export function validateEnvironment() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const ttl = Number(process.env.RESERVATION_TTL_SECONDS || 300);
  if (!Number.isInteger(ttl) || ttl < 30 || ttl > 900)
    throw new Error("Reservation TTL must be 30–900 seconds");
  if (process.env.NODE_ENV === "production") {
    if (process.env.ENABLE_DEMO_AUTH === "true")
      throw new Error("Demo sessions must be disabled in production");
    if (!process.env.METRICS_TOKEN)
      throw new Error("Production metrics require METRICS_TOKEN");
    if (
      process.env.JWT_SECRET === "local-development-only-change-me-32-chars" ||
      process.env.METRICS_TOKEN === "local-monitoring-only"
    )
      throw new Error("Replace the local example secrets before production");
  }
}
