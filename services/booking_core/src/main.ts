import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttp, validateEnvironment } from "./http";
import { Telemetry } from "./telemetry";
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
