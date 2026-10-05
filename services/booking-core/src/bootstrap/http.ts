import { INestApplication, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { ApiExceptionFilter } from "../common/http/api-exception.filter";
import { createRequestTelemetryMiddleware } from "../common/observability/request-telemetry.middleware";
import { Telemetry } from "../common/observability/telemetry";
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
  app.useGlobalFilters(new ApiExceptionFilter(telemetry));
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
  app.use(createRequestTelemetryMiddleware(telemetry));
}
