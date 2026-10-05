import type { Actor } from "@badminton/auth-contracts";
import { discountedQuote } from "@badminton/booking-contracts";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/client";
import { assertCenterManager } from "../../common/auth/center-access";
import { quoteSlots } from "../../common/domain/booking-quote";
import { fixedDates } from "../../common/domain/calendar";
import {
  canonicalSelections,
  fingerprint,
} from "../../common/domain/selections";
import { idempotencyKey } from "../../common/http/idempotency-key";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { FullBooking } from "../../infrastructure/database/booking-records";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { OutboxService } from "../../infrastructure/outbox/outbox.service";
import { SlotAllocationService } from "../availability/slot-allocation.service";
import { CentersService } from "../centers/centers.service";
import { bookingView } from "./booking.mapper";
import { FixedBookingDto } from "./dto/fixed-booking.dto";
@Injectable()
export class FixedBookingsService {
  constructor(
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
    @Inject(CentersService) private readonly centers: CentersService,
    @Inject(SlotAllocationService)
    private readonly allocations: SlotAllocationService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}
  async fixed(actor: Actor, data: FixedBookingDto, key?: string) {
    const idem = idempotencyKey(key),
      dates = fixedDates(
        data.startDate,
        data.endDate,
        data.weekdays,
        this.clock.now(),
      ),
      details = canonicalSelections(data.selections),
      hash = fingerprint({
        ...data,
        weekdays: [...data.weekdays].sort(),
        selections: details,
      });
    const result = await this.transactions.run("fixed", async (tx) => {
      await this.transactions.lock(tx, `fixed:${actor.userId}:${idem}`);
      await this.transactions.lock(tx, data.centerId);
      const center = await this.centers.getInTransaction(tx, data.centerId);
      assertCenterManager(actor, center);
      await this.transactions.releaseExpired(tx, data.centerId);
      const existing = await tx.bookingSeries.findUnique({
        where: {
          createdBy_idempotencyKey: {
            createdBy: actor.userId,
            idempotencyKey: idem,
          },
        },
        include: {
          bookings: { include: { reservation: { include: { center: true } } } },
        },
      });
      if (existing) {
        if (existing.fingerprint !== hash)
          throw new ConflictException("Idempotency-Key đã dùng cho lịch khác");
        return { bookings: existing.bookings, created: false };
      }
      const series = await tx.bookingSeries.create({
          data: {
            createdBy: actor.userId,
            idempotencyKey: idem,
            fingerprint: hash,
          },
        }),
        bookings: FullBooking[] = [];
      for (const date of dates) {
        const selections = quoteSlots(center, this.clock.now(), date, details);
        const reservation = await tx.reservation.create({
          data: {
            centerId: data.centerId,
            userId: data.userId,
            userName: data.userName,
            date,
            status: "CONFIRMED",
            expiresAt: this.clock.now(),
            idempotencyKey: `fixed-${series.id}-${date}`,
            fingerprint: hash,
            selections: selections as unknown as Prisma.InputJsonValue,
            ...discountedQuote(
              selections.reduce((sum, s) => sum + s.price, 0),
              selections.length,
              actor.userId === data.userId ? actor.loyaltyPoints : 0,
            ),
          },
        });
        await this.allocations.allocate(tx, reservation, selections);
        const booking = await tx.booking.create({
          data: {
            reservationId: reservation.id,
            type: "FIXED",
            seriesId: series.id,
          },
          include: { reservation: { include: { center: true } } },
        });
        await this.outbox.record(
          tx,
          booking,
          reservation,
          "booking.confirmed.v1",
        );
        bookings.push(booking);
      }
      return { bookings, created: true };
    });
    if (result.created)
      this.telemetry.event(
        "fixed_created",
        { centerId: data.centerId, actorId: actor.userId },
        result.bookings.length,
      );
    return {
      items: result.bookings.map((b) => bookingView(b)),
      total: result.bookings.length,
    };
  }
}
