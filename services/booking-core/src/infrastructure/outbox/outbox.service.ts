import { Inject, Injectable } from "@nestjs/common";
import { Booking, Prisma, Reservation } from "../../../generated/client";
import { Telemetry } from "../../common/observability/telemetry";
import { Tx } from "../database/booking-records";

export type OutboxRow = {
  id: string;
  type: string;
  aggregateId: string;
  createdAt: Date;
  correlationId: string | null;
  payload: unknown;
};

export type PublishedOutboxEnvelope = {
  id: string;
  type: string;
  aggregateId: string;
  createdAt: string;
  schemaVersion?: 1;
  producer?: "booking-core";
  correlationId?: string;
  payload: unknown;
};

export type CenterAssignedPayload = {
  centerId: string;
  centerName: string;
  managerId: string;
  isActive: boolean;
};

export type SeriesConfirmedPayload = {
  seriesId: string;
  centerId: string;
  recipientUserId: string;
  totalOccurrences: number;
  startDate: string;
  endDate: string;
};

export type BookingReminderPayload = {
  bookingId: string;
  centerId: string;
  userId: string;
  date: string;
  startMinute: number;
  reminderWindow: "T-24h" | "T-2h";
};

const BASELINE_BOOKING_EVENT_TYPES = new Set([
  "booking.confirmed.v1",
  "booking.cancelled.v1",
]);

export function buildOutboxEnvelope(row: OutboxRow): PublishedOutboxEnvelope {
  const base = {
    id: row.id,
    type: row.type,
    aggregateId: row.aggregateId,
    createdAt: row.createdAt.toISOString(),
    payload: row.payload,
  };
  if (BASELINE_BOOKING_EVENT_TYPES.has(row.type)) {
    return base;
  }
  return {
    ...base,
    schemaVersion: 1,
    producer: "booking-core",
    correlationId: row.correlationId || row.id,
  };
}

@Injectable()
export class OutboxService {
  constructor(@Inject(Telemetry) private readonly telemetry: Telemetry) {}

  private currentCorrelationId(): string | undefined {
    return this.telemetry.context.getStore()?.requestId;
  }

  private async recordDomainEvent(
    tx: Tx,
    type: string,
    aggregateId: string,
    payload: Prisma.InputJsonValue,
  ) {
    const correlationId = this.currentCorrelationId();
    await tx.outboxEvent.create({
      data: {
        type,
        aggregateId,
        ...(correlationId ? { correlationId } : {}),
        payload,
      },
    });
  }

  async record(
    tx: Tx,
    booking: Booking,
    reservation: Reservation,
    type: string,
  ) {
    const correlationId = this.currentCorrelationId();
    await tx.outboxEvent.create({
      data: {
        type,
        aggregateId: booking.id,
        ...(correlationId ? { correlationId } : {}),
        payload: {
          ...(correlationId ? { correlationId } : {}),
          bookingId: booking.id,
          reservationId: reservation.id,
          centerId: reservation.centerId,
          userId: reservation.userId,
          date: reservation.date,
          totalPrice: reservation.totalPrice,
          selections: reservation.selections,
        },
      },
    });
  }

  async recordCenterAssigned(tx: Tx, payload: CenterAssignedPayload) {
    await this.recordDomainEvent(
      tx,
      "booking.center-assigned.v1",
      payload.centerId,
      payload as Prisma.InputJsonValue,
    );
  }

  async recordSeriesConfirmed(tx: Tx, payload: SeriesConfirmedPayload) {
    await this.recordDomainEvent(
      tx,
      "booking.series-confirmed.v1",
      payload.seriesId,
      payload as Prisma.InputJsonValue,
    );
  }

  async recordReminder(tx: Tx, payload: BookingReminderPayload) {
    await this.recordDomainEvent(
      tx,
      "booking.reminder.v1",
      payload.bookingId,
      payload as Prisma.InputJsonValue,
    );
  }
}
