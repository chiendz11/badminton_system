import { Global, Module } from "@nestjs/common";
import { Clock, Telemetry } from "./telemetry";
@Global()
@Module({
  imports: [],
  providers: [Clock, Telemetry],
  controllers: [],
  exports: [Clock, Telemetry],
})
export class ObservabilityModule {}
