import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { slotTime, vietnamDate } from "../../common/domain/calendar";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { QuoteSelection } from "../../infrastructure/database/booking-records";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { OutboxService } from "../../infrastructure/outbox/outbox.service";

const DEFAULT_REMINDER_POLL_MS = 60_000;

function earliestStartMinute(rawSelections: unknown): number | null {
  if (!Array.isArray(rawSelections)) return null;
  let earliest: number | null = null;
  for (const item of rawSelections as QuoteSelection[]) {
    if (!Array.isArray(item?.slots)) continue;
    for (const slot of item.slots) {
      if (Number.isInteger(slot) && slot >= 0 && slot <= 1380) {
        earliest = earliest === null ? slot : Math.min(earliest, slot);
      }
    }
  }
  return earliest;
}

function dueReminderWindow(diffMinutes: number): "T-24h" | "T-2h" | null {
  if (diffMinutes > 0 && diffMinutes <= 120) return "T-2h";
  if (diffMinutes > 120 && diffMinutes <= 1440) return "T-24h";
  return null;
}

@Injectable()
export class BookingReminderWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
  ) {}

  onModuleInit() {
    const intervalMs = Math.max(
      5000,
      Number(process.env.BOOKING_REMINDER_POLL_MS || DEFAULT_REMINDER_POLL_MS),
    );
    this.timer = setInterval(
      () =>
        void this.enqueueDueReminders().catch((err) =>
          this.telemetry.logger.error({ err }, "booking.reminder.scan_failed"),
        ),
      intervalMs,
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async enqueueDueReminders(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let enqueued = 0;

    try {
      const now = this.clock.now();
      const today = vietnamDate(now);
      const tomorrow = vietnamDate(new Date(now.getTime() + 86_400_000));

      const candidates = await this.prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          reservation: { date: { in: [today, tomorrow] } },
        },
        select: {
          id: true,
          reminders: { select: { reminderWindow: true } },
          reservation: {
            select: {
              centerId: true,
              userId: true,
              date: true,
              selections: true,
            },
          },
        },
        take: 200,
      });

      for (const booking of candidates) {
        const startMinute = earliestStartMinute(booking.reservation.selections);
        if (startMinute === null) continue;

        const startsAt = slotTime(booking.reservation.date, startMinute);
        const diffMinutes = (startsAt.getTime() - now.getTime()) / 60_000;
        const reminderWindow = dueReminderWindow(diffMinutes);
        if (!reminderWindow) continue;

        if (
          booking.reminders.some(
            (existing) => existing.reminderWindow === reminderWindow,
          )
        ) {
          continue;
        }

        const recorded = await this.prisma.$transaction(async (tx) => {
          const inserted = await tx.bookingReminder.createMany({
            data: [{ bookingId: booking.id, reminderWindow }],
            skipDuplicates: true,
          });
          if (inserted.count !== 1) return false;

          await this.outbox.recordReminder(tx, {
            bookingId: booking.id,
            centerId: booking.reservation.centerId,
            userId: booking.reservation.userId,
            date: booking.reservation.date,
            startMinute,
            reminderWindow,
          });
          return true;
        });

        if (recorded) enqueued += 1;
      }

      return enqueued;
    } finally {
      this.running = false;
    }
  }
}
