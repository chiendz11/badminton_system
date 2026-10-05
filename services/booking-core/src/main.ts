import { NestFactory } from "@nestjs/core";
import "dotenv/config";
import "reflect-metadata";
import { AppModule } from "./app.module";
import { configureHttp } from "./bootstrap/http";
import { validateEnvironment } from "./common/config/environment";
import { Telemetry } from "./common/observability/telemetry";
async function main() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, "0.0.0.0");
  app.get(Telemetry).logger.info({ port }, "booking-core.started");
}
void main().catch((error) => {
  process.stderr.write(
    JSON.stringify({
      level: "fatal",
      message: "booking-core.startup.failed",
      error: String(error),
    }) + "\n",
  );
  process.exitCode = 1;
});
