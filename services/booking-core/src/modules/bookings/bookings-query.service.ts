import type { Actor } from "@badminton/auth-contracts";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../generated/client";
import { assertCenterManager } from "../../common/auth/center-access";
import { calendarDate, vietnamDate } from "../../common/domain/calendar";
import { Clock } from "../../common/observability/telemetry";
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
    @Inject(Clock) private readonly clock: Clock,
  ) {}
  async listBookings(
    actor: Actor,
    query: ListDto,
    centerId?: string,
    admin = false,
  ) {
    for (const date of [query.date, query.dateFrom, query.dateTo])
      if (date) calendarDate(date);
    if (query.dateFrom && query.dateTo && query.dateTo < query.dateFrom)
      throw new BadRequestException("Khoảng ngày không hợp lệ");
    if (admin && actor.role === "user")
      throw new ForbiddenException("Cần quyền quản lý");
    const selectedCenter = centerId ?? query.centerId;
    if (centerId || (admin && selectedCenter))
      assertCenterManager(actor, await this.centers.center(selectedCenter!));
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(!admin && !centerId ? { hiddenAt: null } : {}),
      reservation: {
        ...(!admin && !centerId
          ? { userId: actor.userId }
          : actor.role === "center_manager"
            ? { center: { managerId: actor.userId } }
            : {}),
        ...(selectedCenter ? { centerId: selectedCenter } : {}),
        ...(query.date
          ? { date: query.date }
          : query.dateFrom || query.dateTo
            ? { date: { gte: query.dateFrom, lte: query.dateTo } }
            : {}),
        ...(query.search
          ? {
              OR: [
                { userName: { contains: query.search, mode: "insensitive" } },
                {
                  center: {
                    name: { contains: query.search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
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
      items: rows.map(bookingView),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async get(actor: Actor, id: string) {
    const row = await this.prisma.booking.findUnique({
      where: { id },
      include: { reservation: { include: { center: true } } },
    });
    if (!row) throw new NotFoundException("Không tìm thấy booking");
    if (row.reservation.userId !== actor.userId)
      assertCenterManager(actor, row.reservation.center);
    return bookingView(row);
  }
  async stats(actor: Actor, period = "month") {
    const bookings = await this.prisma.booking.findMany({
      where: { reservation: { userId: actor.userId } },
      include: { reservation: { include: { center: true } } },
    });
    const active = bookings.filter((b) => b.status === "CONFIRMED");
    const today = vietnamDate(this.clock.now()),
      end = new Date(today + "T12:00:00Z");
    const start = new Date(end);
    if (period === "week") start.setUTCDate(start.getUTCDate() - 7);
    else if (period === "year")
      start.setUTCFullYear(start.getUTCFullYear() - 1);
    else start.setUTCMonth(start.getUTCMonth() - 1);
    const startDate = start.toISOString().slice(0, 10);
    const current = bookings.filter(
      (b) => b.reservation.date >= startDate && b.reservation.date <= today,
    );
    const previousStart = new Date(
      start.getTime() - (end.getTime() - start.getTime()),
    )
      .toISOString()
      .slice(0, 10);
    const previous = bookings.filter(
      (b) =>
        b.reservation.date >= previousStart && b.reservation.date < startDate,
    );
    const summary = (rows: typeof bookings) => ({
      totalBookings: rows.length,
      completedBookings: rows.filter((b) => b.status === "CONFIRMED").length,
      cancelledBookings: rows.filter((b) => b.status === "CANCELLED").length,
      completionRate: rows.length
        ? (100 * rows.filter((b) => b.status === "CONFIRMED").length) /
          rows.length
        : 0,
    });
    const nowStats = summary(current),
      prevStats = summary(previous),
      change = (a: number, b: number) =>
        b ? (100 * (a - b)) / b : a ? 100 : 0;
    const monthlyStats = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      completed: 0,
      cancelled: 0,
    }));
    const centers = new Map<
      string,
      { centerId: string; centerName: string; bookingCount: number }
    >();
    for (const b of current) {
      const date = new Date(b.reservation.date + "T12:00:00Z");
      const month = monthlyStats[date.getUTCMonth()];
      if (b.status === "CONFIRMED") month.completed++;
      else month.cancelled++;
      const item = centers.get(b.reservation.centerId) ?? {
        centerId: b.reservation.centerId,
        centerName: b.reservation.center.name,
        bookingCount: 0,
      };
      item.bookingCount++;
      centers.set(item.centerId, item);
    }
    const timeCounts: Record<string, number> = {
      Sáng: 0,
      Trưa: 0,
      Chiều: 0,
      Tối: 0,
    };
    for (const booking of current.filter((b) => b.status === "CONFIRMED")) {
      for (const selection of booking.reservation
        .selections as unknown as QuoteSelection[]) {
        for (const minute of selection.slots) {
          const session =
            minute < 660
              ? "Sáng"
              : minute < 840
                ? "Trưa"
                : minute < 1080
                  ? "Chiều"
                  : "Tối";
          timeCounts[session]++;
        }
      }
    }
    const totalSlots = Object.values(timeCounts).reduce((a, b) => a + b, 0);
    const popular = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      timeStats: {
        percentages: Object.fromEntries(
          Object.entries(timeCounts).map(([session, count]) => [
            session,
            totalSlots ? Math.round((100 * count) / totalSlots) : 0,
          ]),
        ),
        popularTimeRange: totalSlots ? popular[0] : "Chưa có dữ liệu",
        popularCount: popular[1],
      },
      confirmed: active.length,
      cancelled: bookings.length - active.length,
      totalPrice: active.reduce((n, b) => n + b.reservation.totalPrice, 0),
      hours: active.reduce(
        (n, b) =>
          n +
          (b.reservation.selections as unknown as QuoteSelection[]).reduce(
            (m, s) => m + s.slots.length,
            0,
          ),
        0,
      ),
      overview: nowStats,
      comparison: {
        totalChange: change(nowStats.totalBookings, prevStats.totalBookings),
        completedChange: change(
          nowStats.completedBookings,
          prevStats.completedBookings,
        ),
        cancelledChange: change(
          nowStats.cancelledBookings,
          prevStats.cancelledBookings,
        ),
        pointsChange: 0,
      },
      monthlyStats,
      frequentCenters: [...centers.values()]
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, 5),
    };
  }
}
