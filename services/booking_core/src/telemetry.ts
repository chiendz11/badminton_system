import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import { createLogger, createMetrics } from "@badminton/observability";
@Injectable()
export class Clock {
  now() {
    return new Date();
  }
}
@Injectable()
export class Telemetry {
  readonly logger = createLogger();
  readonly metrics = createMetrics();
  readonly context = new AsyncLocalStorage<{ requestId: string }>();
  event(action: string, details: Record<string, unknown>, count = 1) {
    this.metrics.transitions.inc({ action }, count);
    this.logger.info(
      { ...this.context.getStore(), action, ...details },
      "booking.transition",
    );
  }
}
