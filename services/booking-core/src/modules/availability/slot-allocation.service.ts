import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Reservation } from "../../../generated/client";
import { slotTime } from "../../common/domain/calendar";
import { Telemetry } from "../../common/observability/telemetry";
import {
  QuoteSelection,
  Tx,
} from "../../infrastructure/database/booking-records";
@Injectable()
export class SlotAllocationService {
  constructor(@Inject(Telemetry) private readonly telemetry: Telemetry) {}
  async allocate(
    tx: Tx,
    reservation: Reservation,
    selections: QuoteSelection[],
  ) {
    const rows = selections.flatMap((d) =>
      d.slots.map((slot) => ({
        courtId: d.courtId,
        reservationId: reservation.id,
        startsAt: slotTime(reservation.date, slot),
        endsAt: slotTime(reservation.date, slot + 60),
      })),
    );
    const overlaps = await tx.slotAllocation.count({
      where: {
        OR: rows.map((row) => ({
          courtId: row.courtId,
          startsAt: { lt: row.endsAt },
          endsAt: { gt: row.startsAt },
        })),
      },
    });
    if (overlaps) {
      this.telemetry.metrics.conflicts.inc({ operation: "allocate" });
      throw new ConflictException("Khung giờ vừa được người khác giữ hoặc đặt");
    }
    await tx.slotAllocation.createMany({ data: rows });
  }
}
