import pino from "pino";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
export function createLogger(
  destination?: pino.DestinationStream,
  service = "booking-core",
) {
  const options: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
    base: { service },
    redact: {
      paths: [
        "authorization",
        "cookie",
        "password",
        "token",
        "refreshToken",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
  };
  return destination ? pino(options, destination) : pino(options);
}
export function createMetrics() {
  const registry = new Registry();
  registry.setDefaultLabels({ service: "booking-core" });
  collectDefaultMetrics({ register: registry });
  const requests = new Counter({
    name: "booking_core_http_requests_total",
    help: "Completed HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const duration = new Histogram({
    name: "booking_core_http_duration_seconds",
    help: "HTTP request duration",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry],
  });
  const transitions = new Counter({
    name: "booking_core_transitions_total",
    help: "Committed booking/reservation transitions",
    labelNames: ["action"],
    registers: [registry],
  });
  const conflicts = new Counter({
    name: "booking_core_conflicts_total",
    help: "Rejected conflicting bookings",
    labelNames: ["operation"],
    registers: [registry],
  });
  const transactions = new Histogram({
    name: "booking_core_transaction_duration_seconds",
    help: "Database transaction duration",
    labelNames: ["operation"],
    registers: [registry],
  });
  const activeHolds = new Gauge({
    name: "booking_core_active_holds",
    help: "Unexpired held reservations",
    registers: [registry],
  });
  const outboxPending = new Gauge({
    name: "booking_core_outbox_pending",
    help: "Durable events awaiting publication",
    registers: [registry],
  });
  const databaseUp = new Gauge({
    name: "booking_core_database_up",
    help: "Database reachable during the latest scrape",
    registers: [registry],
  });
  return {
    registry,
    requests,
    duration,
    transitions,
    conflicts,
    transactions,
    activeHolds,
    outboxPending,
    databaseUp,
  };
}
