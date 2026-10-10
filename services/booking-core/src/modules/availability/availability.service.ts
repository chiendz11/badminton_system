import type { Actor } from "@badminton/auth-contracts";
import { Inject, Injectable } from "@nestjs/common";
import { assertCenterManager } from "../../common/auth/center-access";
import {
  calendarDate,
  fixedDates,
  slotTime,
} from "../../common/domain/calendar";
import { slotPrice } from "../../common/domain/pricing";
import { Clock } from "../../common/observability/telemetry";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { FullCenter } from "../centers/center.select";
import { CentersService } from "../centers/centers.service";
import { FixedRangeDto } from "./dto/availability.dto";
@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(CentersService) private readonly centers: CentersService,
  ) {}
  async availability(centerId: string, date: string) {
    return this.calendar(await this.centers.center(centerId), date);
  }
  private async calendar(center: FullCenter, date: string) {
    calendarDate(date);
    const centerId = center.id;
    const occupied = await this.prisma.slotAllocation.findMany({
      where: {
        court: { centerId },
        startsAt: { gte: slotTime(date, 0), lt: slotTime(date, 1440) },
        reservation: {
          OR: [
            { status: "CONFIRMED" },
            { status: "HELD", expiresAt: { gt: this.clock.now() } },
          ],
        },
      },
      include: { reservation: { select: { status: true } } },
    });
    const states = new Map(
      occupied.map((a) => [
        `${a.courtId}:${a.startsAt.getTime()}`,
        a.reservation.status,
      ]),
    );
    return {
      centerId,
      date,
      courts: center.courts.map((court) => ({
        ...court,
        slots: Array.from(
          { length: (center.closeMinute - center.openMinute) / 60 },
          (_, index) => {
            const minute = center.openMinute + index * 60;
            const state =
              !center.isActive || !court.isActive
                ? "CLOSED"
                : slotTime(date, minute) <= this.clock.now()
                  ? "PAST"
                  : states.get(
                        `${court.id}:${slotTime(date, minute).getTime()}`,
                      ) === "CONFIRMED"
                    ? "BOOKED"
                    : states.has(
                          `${court.id}:${slotTime(date, minute).getTime()}`,
                        )
                      ? "HELD"
                      : "AVAILABLE";
            return {
              minute,
              price: slotPrice(center.pricing, date, minute),
              state,
              available: state === "AVAILABLE",
            };
          },
        ),
      })),
    };
  }
  async fixedAvailability(actor: Actor, data: FixedRangeDto) {
    const center = await this.centers.center(data.centerId);
    assertCenterManager(actor, center);
    const dates = fixedDates(
      data.startDate,
      data.endDate,
      data.weekdays,
      this.clock.now(),
    );
    const calendars = await Promise.all(
      dates.map((date) => this.calendar(center, date)),
    );
    return {
      centerId: data.centerId,
      date: data.startDate,
      dates,
      courts: calendars[0].courts.map((court) => ({
        ...court,
        slots: court.slots.map((slot) => {
          const occurrences = calendars.map((calendar) =>
            calendar.courts
              .find((item) => item.id === court.id)!
              .slots.find((item) => item.minute === slot.minute)!,
          );
          const unavailable = occurrences.find((item) => !item.available);
          return {
            ...slot,
            price: occurrences.reduce((sum, item) => sum + item.price, 0),
            available: !unavailable,
            state: unavailable?.state || "AVAILABLE",
          };
        }),
      })),
    };
  }
}
