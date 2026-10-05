import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, type Booking, type Reservation } from "../generated/client";
import type { Actor } from "@badminton/auth-contracts";
import {
  discountedQuote,
  type Selection,
  type PricingBand,
} from "@badminton/booking-contracts";
import { PrismaService } from "./prisma.service";
import { Clock, Telemetry } from "./telemetry";
import {
  canonicalSelections,
  calendarDate,
  fingerprint,
  fixedDates,
  futureDate,
  slotPrice,
  slotTime,
  validateBands,
} from "./domain";
import {
  CenterDto,
  UpdateCenterDto,
  CourtDto,
  UpdateCourtDto,
  ReservationDto,
  FixedBookingDto,
  FixedRangeDto,
  ListDto,
} from "./dto";
type Tx = Prisma.TransactionClient;
const CENTER_INCLUDE = {
  courts: { orderBy: { name: "asc" as const } },
  pricing: { orderBy: { startMinute: "asc" as const } },
};
type FullCenter = Prisma.CenterGetPayload<{ include: typeof CENTER_INCLUDE }>;
type FullBooking = Prisma.BookingGetPayload<{
  include: { reservation: { include: { center: true } } };
}>;
type QuoteSelection = Selection & { courtName: string; price: number };
@Injectable()
export class BookingService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly expirations = new WeakMap<object, number>();
  constructor(
    @Inject(PrismaService) readonly prisma: PrismaService,
    @Inject(Clock) readonly clock: Clock,
    @Inject(Telemetry) readonly telemetry: Telemetry,
  ) {}
  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.expire().catch((err) =>
          this.telemetry.logger.error({ err }, "reservation.expiry.failed"),
        ),
      15000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async lock(tx: Tx, key: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key.toLowerCase()},0))::text`;
  }
  private async mutate<T>(
    operation: string,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    const stop = this.telemetry.metrics.transactions.startTimer({ operation });
    try {
      let expired = 0;
      const result = await this.prisma.$transaction(
        async (tx) => {
          const value = await work(tx);
          expired = this.expirations.get(tx) || 0;
          return value;
        },
        { timeout: 20000, maxWait: 10000 },
      );
      if (expired) this.telemetry.event("expired", { operation }, expired);
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" ||
          (error.code === "P2004" &&
            String(error.meta?.database_error).includes("slot_no_overlap")))
      ) {
        this.telemetry.metrics.conflicts.inc({ operation });
        throw new ConflictException(
          "Sân hoặc yêu cầu đã tồn tại, vui lòng tải lại lịch",
        );
      }
      throw error;
    } finally {
      stop();
    }
  }
  private async getCenter(tx: Tx, id: string) {
    const center = await tx.center.findUnique({
      where: { id },
      include: CENTER_INCLUDE,
    });
    if (!center) throw new NotFoundException("Không tìm thấy trung tâm");
    return center;
  }
  private assertManager(actor: Actor, center: { managerId: string }) {
    if (
      actor.role !== "super_admin" &&
      !(actor.role === "center_manager" && center.managerId === actor.userId)
    )
      throw new ForbiddenException("Bạn không quản lý trung tâm này");
  }
  private async releaseExpired(tx: Tx, centerId: string) {
    const expired = await tx.reservation.findMany({
      where: { centerId, status: "HELD", expiresAt: { lte: this.clock.now() } },
      select: { id: true },
    });
    if (!expired.length) return 0;
    const ids = expired.map((r) => r.id);
    await tx.slotAllocation.deleteMany({
      where: { reservationId: { in: ids } },
    });
    await tx.reservation.updateMany({
      where: { id: { in: ids }, status: "HELD" },
      data: { status: "EXPIRED" },
    });
    this.expirations.set(tx, (this.expirations.get(tx) || 0) + ids.length);
    return ids.length;
  }
  async expire() {
    const centers = await this.prisma.reservation.findMany({
      where: { status: "HELD", expiresAt: { lte: this.clock.now() } },
      select: { centerId: true },
      distinct: ["centerId"],
      take: 100,
    });
    for (const { centerId } of centers) {
      await this.mutate("expire", async (tx) => {
        await this.lock(tx, centerId);
        return this.releaseExpired(tx, centerId);
      });
    }
  }
  async listCenters(query: ListDto, actor?: Actor) {
    if (query.managed === "true" && (!actor || actor.role === "user"))
      throw new ForbiddenException("Cần đăng nhập để xem trung tâm quản lý");
    const where: Prisma.CenterWhereInput = {
      ...(query.managed === "true"
        ? actor?.role === "super_admin"
          ? {}
          : { managerId: actor?.userId }
        : { isActive: true }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { address: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.center.findMany({
        where,
        include: CENTER_INCLUDE,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.center.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async center(id: string) {
    return this.getCenter(this.prisma, id);
  }
  async createCenter(actor: Actor, data: CenterDto) {
    if (actor.role !== "super_admin")
      throw new ForbiddenException("Chỉ admin hệ thống được tạo trung tâm");
    const { pricePerHour, ...fields } = data;
    const bands: PricingBand[] = ["WEEKDAY", "WEEKEND"].map((dayType) => ({
      dayType: dayType as PricingBand["dayType"],
      startMinute: data.openMinute,
      endMinute: data.closeMinute,
      pricePerHour,
    }));
    validateBands(bands, data.openMinute, data.closeMinute);
    const center = await this.prisma.center.create({
      data: { ...fields, pricing: { create: bands } },
      include: CENTER_INCLUDE,
    });
    this.telemetry.event("center_created", {
      centerId: center.id,
      actorId: actor.userId,
    });
    return center;
  }
  async updateCenter(actor: Actor, id: string, data: UpdateCenterDto) {
    const result = await this.mutate("center_update", async (tx) => {
      await this.lock(tx, id);
      const center = await this.getCenter(tx, id);
      this.assertManager(actor, center);
      await this.releaseExpired(tx, id);
      if (
        data.isActive === false &&
        (await tx.slotAllocation.count({
          where: { court: { centerId: id }, endsAt: { gt: this.clock.now() } },
        }))
      )
        throw new ConflictException(
          "Trung tâm còn lịch giữ chỗ hoặc booking tương lai",
        );
      return tx.center.update({ where: { id }, data, include: CENTER_INCLUDE });
    });
    this.telemetry.event("center_updated", {
      centerId: id,
      actorId: actor.userId,
    });
    return result;
  }
  async createCourt(actor: Actor, centerId: string, data: CourtDto) {
    return this.mutate("court_create", async (tx) => {
      await this.lock(tx, centerId);
      this.assertManager(actor, await this.getCenter(tx, centerId));
      const court = await tx.court.create({ data: { centerId, ...data } });
      return court;
    });
  }
  async updateCourt(
    actor: Actor,
    centerId: string,
    id: string,
    data: UpdateCourtDto,
  ) {
    return this.mutate("court_update", async (tx) => {
      await this.lock(tx, centerId);
      this.assertManager(actor, await this.getCenter(tx, centerId));
      const court = await tx.court.findFirst({ where: { id, centerId } });
      if (!court) throw new NotFoundException("Không tìm thấy sân");
      await this.releaseExpired(tx, centerId);
      if (
        data.isActive === false &&
        (await tx.slotAllocation.count({
          where: { courtId: id, endsAt: { gt: this.clock.now() } },
        }))
      )
        throw new ConflictException(
          "Sân còn lịch giữ chỗ hoặc booking tương lai",
        );
      return tx.court.update({ where: { id }, data });
    });
  }
  async pricing(actor: Actor, centerId: string, bands: PricingBand[]) {
    return this.mutate("pricing_update", async (tx) => {
      await this.lock(tx, centerId);
      const center = await this.getCenter(tx, centerId);
      this.assertManager(actor, center);
      validateBands(bands, center.openMinute, center.closeMinute);
      await tx.pricingBand.deleteMany({ where: { centerId } });
      await tx.pricingBand.createMany({
        data: bands.map((b) => ({ ...b, centerId })),
      });
      return this.getCenter(tx, centerId);
    });
  }
  async availability(centerId: string, date: string) {
    calendarDate(date);
    const center = await this.center(centerId);
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
    const center = await this.center(data.centerId);
    this.assertManager(actor, center);
    const dates = fixedDates(
      data.startDate,
      data.endDate,
      data.weekdays,
      this.clock.now(),
    );
    const calendars = await Promise.all(
      dates.map((date) => this.availability(data.centerId, date)),
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
  private quote(
    center: FullCenter,
    date: string,
    details: Selection[],
  ): QuoteSelection[] {
    futureDate(date, this.clock.now());
    if (!center.isActive)
      throw new ConflictException("Trung tâm đang tạm dừng");
    return canonicalSelections(details).map((detail) => {
      const court = center.courts.find(
        (c) => c.id === detail.courtId && c.isActive,
      );
      if (!court)
        throw new BadRequestException("Sân không thuộc trung tâm hoặc đã đóng");
      for (const slot of detail.slots)
        if (
          slot < center.openMinute ||
          slot + 60 > center.closeMinute ||
          slotTime(date, slot) <= this.clock.now()
        )
          throw new BadRequestException(
            "Khung giờ đã qua hoặc ngoài giờ mở cửa",
          );
      return {
        ...detail,
        courtName: court.name,
        price: detail.slots.reduce(
          (sum, slot) => sum + slotPrice(center.pricing, date, slot),
          0,
        ),
      };
    });
  }
  private async allocate(
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
  private key(value?: string) {
    if (!value || !/^[A-Za-z0-9_-]{8,128}$/.test(value))
      throw new BadRequestException("Cần Idempotency-Key hợp lệ (8–128 ký tự)");
    return value;
  }
  async reserve(actor: Actor, data: ReservationDto, key?: string) {
    const idem = this.key(key),
      details = canonicalSelections(data.selections),
      hash = fingerprint({
        centerId: data.centerId,
        date: data.date,
        selections: details,
      });
    const result = await this.mutate("reserve", async (tx) => {
      await this.lock(tx, `actor:${actor.userId}`);
      await this.lock(tx, `reservation:${actor.userId}:${idem}`);
      await this.lock(tx, data.centerId);
      await this.releaseExpired(tx, data.centerId);
      const existing = await tx.reservation.findUnique({
        where: {
          userId_idempotencyKey: { userId: actor.userId, idempotencyKey: idem },
        },
      });
      if (existing) {
        if (existing.fingerprint !== hash)
          throw new ConflictException(
            "Idempotency-Key đã được dùng cho nội dung khác",
          );
        return { reservation: existing, created: false };
      }
      if (
        (await tx.reservation.count({
          where: {
            userId: actor.userId,
            status: "HELD",
            expiresAt: { gt: this.clock.now() },
          },
        })) >= 5
      )
        throw new ConflictException(
          "Bạn đã có 5 giữ chỗ đang hoạt động. Hãy xác nhận hoặc bỏ giữ chỗ cũ.",
        );
      const center = await this.getCenter(tx, data.centerId),
        selections = this.quote(center, data.date, details);
      const reservation = await tx.reservation.create({
        data: {
          centerId: data.centerId,
          date: data.date,
          userId: actor.userId,
          userName: actor.name,
          idempotencyKey: idem,
          fingerprint: hash,
          selections: selections as unknown as Prisma.InputJsonValue,
          ...discountedQuote(
            selections.reduce((sum, d) => sum + d.price, 0),
            selections.length,
            actor.loyaltyPoints,
          ),
          expiresAt: new Date(
            Math.min(
              this.clock.now().getTime() +
                Number(process.env.RESERVATION_TTL_SECONDS || 300) * 1000,
              ...selections.flatMap((detail) =>
                detail.slots.map((minute) =>
                  slotTime(data.date, minute).getTime(),
                ),
              ),
            ),
          ),
        },
      });
      await this.allocate(tx, reservation, selections);
      return { reservation, created: true };
    });
    if (result.created)
      this.telemetry.event("held", {
        reservationId: result.reservation.id,
        centerId: data.centerId,
        actorId: actor.userId,
      });
    return result.reservation;
  }
  private async outbox(
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
  bookingView(booking: FullBooking) {
    const res = booking.reservation;
    return {
      id: booking.id,
      reservationId: res.id,
      centerId: res.centerId,
      centerName: res.center.name,
      userId: res.userId,
      userName: res.userName,
      date: res.date,
      status: booking.status,
      type: booking.type,
      totalPrice: res.totalPrice,
      basePrice: res.basePrice,
      discountAmount: res.discountAmount,
      discountPercent: res.discountPercent,
      createdAt: booking.createdAt,
      selections: res.selections,
    };
  }
  async confirm(actor: Actor, id: string) {
    const initial = await this.prisma.reservation.findUnique({ where: { id } });
    if (!initial || initial.userId !== actor.userId)
      throw new NotFoundException("Không tìm thấy giữ chỗ");
    const result = await this.mutate("confirm", async (tx) => {
      await this.lock(tx, initial.centerId);
      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id },
      });
      if (reservation.status === "CONFIRMED") {
        const booking = await tx.booking.findUniqueOrThrow({
          where: { reservationId: id },
          include: { reservation: { include: { center: true } } },
        });
        return { booking, created: false, expired: false };
      }
      if (
        reservation.status === "HELD" &&
        reservation.expiresAt <= this.clock.now()
      ) {
        await this.releaseExpired(tx, reservation.centerId);
        return { expired: true, created: false, booking: null };
      }
      if (reservation.status === "EXPIRED")
        return { expired: true, created: false, booking: null };
      if (reservation.status !== "HELD")
        throw new ConflictException("Giữ chỗ đã bị hủy");
      await tx.reservation.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });
      const booking = await tx.booking.create({
        data: { reservationId: id },
        include: { reservation: { include: { center: true } } },
      });
      await this.outbox(tx, booking, reservation, "booking.confirmed.v1");
      return { booking, created: true, expired: false };
    });
    if (result.expired)
      throw new GoneException("Giữ chỗ đã hết hạn, vui lòng chọn lại");
    if (result.created)
      this.telemetry.event("confirmed", {
        bookingId: result.booking!.id,
        reservationId: id,
        actorId: actor.userId,
      });
    return this.bookingView(result.booking!);
  }
  async release(actor: Actor, id: string) {
    const initial = await this.prisma.reservation.findUnique({ where: { id } });
    if (!initial || initial.userId !== actor.userId)
      throw new NotFoundException("Không tìm thấy giữ chỗ");
    const result = await this.mutate("release", async (tx) => {
      await this.lock(tx, initial.centerId);
      const current = await tx.reservation.findUniqueOrThrow({ where: { id } });
      if (current.status === "CONFIRMED")
        throw new ConflictException("Dùng chức năng hủy booking đã xác nhận");
      if (current.status === "HELD") {
        await tx.slotAllocation.deleteMany({ where: { reservationId: id } });
        const reservation = await tx.reservation.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
        return { reservation, changed: true };
      }
      return { reservation: current, changed: false };
    });
    if (result.changed)
      this.telemetry.event("released", {
        reservationId: id,
        actorId: actor.userId,
      });
    return result.reservation;
  }
  async cancel(actor: Actor, id: string) {
    const initial = await this.prisma.booking.findUnique({
      where: { id },
      include: { reservation: { include: { center: true } } },
    });
    if (!initial) throw new NotFoundException("Không tìm thấy booking");
    if (initial.reservation.userId !== actor.userId)
      this.assertManager(actor, initial.reservation.center);
    const result = await this.mutate("cancel", async (tx) => {
      await this.lock(tx, initial.reservation.centerId);
      const current = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: { reservation: { include: { center: true } } },
      });
      if (current.reservation.userId !== actor.userId)
        this.assertManager(actor, current.reservation.center);
      if (current.status === "CANCELLED")
        return { booking: current, changed: false };
      if (
        (current.reservation.selections as unknown as QuoteSelection[]).some(
          (s) =>
            s.slots.some(
              (minute) =>
                slotTime(current.reservation.date, minute) <= this.clock.now(),
            ),
        )
      )
        throw new ConflictException("Không thể hủy booking đã bắt đầu");
      await tx.slotAllocation.deleteMany({
        where: { reservationId: current.reservationId },
      });
      await tx.reservation.update({
        where: { id: current.reservationId },
        data: { status: "CANCELLED" },
      });
      const booking = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: this.clock.now() },
        include: { reservation: { include: { center: true } } },
      });
      await this.outbox(
        tx,
        booking,
        current.reservation,
        "booking.cancelled.v1",
      );
      return { booking, changed: true };
    });
    if (result.changed)
      this.telemetry.event("cancelled", {
        bookingId: id,
        actorId: actor.userId,
      });
    return this.bookingView(result.booking);
  }
  async listBookings(actor: Actor, query: ListDto, centerId?: string) {
    if (query.date) calendarDate(query.date);
    if (centerId) this.assertManager(actor, await this.center(centerId));
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
      items: rows.map((b) => this.bookingView(b)),
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
  async fixed(actor: Actor, data: FixedBookingDto, key?: string) {
    const idem = this.key(key),
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
    const result = await this.mutate("fixed", async (tx) => {
      await this.lock(tx, `fixed:${actor.userId}:${idem}`);
      await this.lock(tx, data.centerId);
      const center = await this.getCenter(tx, data.centerId);
      this.assertManager(actor, center);
      await this.releaseExpired(tx, data.centerId);
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
        const selections = this.quote(center, date, details);
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
        await this.allocate(tx, reservation, selections);
        const booking = await tx.booking.create({
          data: {
            reservationId: reservation.id,
            type: "FIXED",
            seriesId: series.id,
          },
          include: { reservation: { include: { center: true } } },
        });
        await this.outbox(tx, booking, reservation, "booking.confirmed.v1");
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
      items: result.bookings.map((b) => this.bookingView(b)),
      total: result.bookings.length,
    };
  }
}
