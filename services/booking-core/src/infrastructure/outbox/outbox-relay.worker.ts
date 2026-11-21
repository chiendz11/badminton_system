import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { PrismaService } from "../database/prisma.service";
import { OUTBOX_PUBLISHER, OutboxPublisher } from "./outbox-publisher";
import { buildOutboxEnvelope } from "./outbox.service";

const DEFAULT_POLL_MS = 5000;
const MAX_ATTEMPTS = 20;

@Injectable()
export class OutboxRelayWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OUTBOX_PUBLISHER) private readonly publisher: OutboxPublisher,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
  ) {}

  onModuleInit() {
    if (!process.env.RABBITMQ_URL) {
      this.telemetry.logger.info("outbox.relay.disabled_without_rabbitmq_url");
      return;
    }
    const intervalMs = Math.max(
      1000,
      Number(process.env.OUTBOX_POLL_INTERVAL_MS || DEFAULT_POLL_MS),
    );
    this.timer = setInterval(
      () =>
        void this.flushPending().catch((err) =>
          this.telemetry.logger.error({ err }, "outbox.relay.batch_failed"),
        ),
      intervalMs,
    );
    this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.publisher.close?.();
  }

  async flushPending(limit = 50): Promise<number> {
    if (this.flushing) return 0;
    this.flushing = true;
    let publishedCount = 0;

    try {
      const pending = await this.prisma.outboxEvent.findMany({
        where: { publishedAt: null, attempts: { lt: MAX_ATTEMPTS } },
        orderBy: [{ attempts: "asc" }, { createdAt: "asc" }],
        take: limit,
      });

      for (const row of pending) {
        const envelope = buildOutboxEnvelope(row);
        try {
          await this.publisher.publish(envelope, row.correlationId ?? undefined);
          await this.prisma.outboxEvent.updateMany({
            where: { id: row.id, publishedAt: null },
            data: { publishedAt: this.clock.now() },
          });
          publishedCount += 1;
        } catch (err) {
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: { attempts: { increment: 1 } },
          });
          this.telemetry.logger.warn(
            { err, eventId: row.id, eventType: row.type, attempts: row.attempts + 1 },
            "outbox.publish.failed",
          );
        }
      }

      return publishedCount;
    } finally {
      this.flushing = false;
    }
  }
}
