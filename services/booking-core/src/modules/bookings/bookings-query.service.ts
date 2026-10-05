import type { Actor } from "@badminton/auth-contracts";
import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/client";
import { assertCenterManager } from "../../common/auth/center-access";
import { calendarDate } from "../../common/domain/calendar";
import { ListDto } from "../../common/http/list.dto";
import { QuoteSelection } from "../../infrastructure/database/booking-records";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CentersService } from "../centers/centers.service";
import { bookingView } from "./booking.mapper";
@Injectable()
export class BookingsQueryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CentersService) private readonly centers: CentersService,
  ) {}
  async listBookings(actor: Actor, query: ListDto, centerId?: string) {
    if (query.date) calendarDate(query.date);
    if (centerId)
      assertCenterManager(actor, await this.centers.center(centerId));
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      reservation: {
        ...(centerId ? { centerId } : { userId: actor.userId }),
        ...(query.date ? { date: query.date } : {}),
      },
    };
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { reservation: { include: { center: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return {
      items: rows.map((b) => bookingView(b)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async stats(actor: Actor) {
    const bookings = await this.prisma.booking.findMany({
      where: { reservation: { userId: actor.userId } },
      include: { reservation: true },
    });
    const active = bookings.filter((b) => b.status === "CONFIRMED");
    return {
      confirmed: active.length,
      cancelled: bookings.length - active.length,
      totalPrice: active.reduce((sum, b) => sum + b.reservation.totalPrice, 0),
      hours: active.reduce(
        (sum, b) =>
          sum +
          (b.reservation.selections as unknown as QuoteSelection[]).reduce(
            (n, s) => n + s.slots.length,
            0,
          ),
        0,
      ),
    };
  }
}
