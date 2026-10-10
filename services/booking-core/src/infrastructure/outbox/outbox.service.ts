import { Inject, Injectable } from "@nestjs/common";
import { Booking, Reservation } from "../../../generated/client";
import { Telemetry } from "../../common/observability/telemetry";
import { Tx } from "../database/booking-records";
@Injectable()
export class OutboxService {
  constructor(@Inject(Telemetry) private readonly telemetry: Telemetry) {}
  async record(
    tx: Tx,
    booking: Booking,
    reservation: Reservation,
    type: string,
  ) {
    await tx.outboxEvent.create({
      data: {
        type,
        aggregateId: booking.id,
        payload: {
          ...(this.telemetry.context.getStore()?.requestId
            ? { correlationId: this.telemetry.context.getStore()!.requestId }
            : {}),
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
}
