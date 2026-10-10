import type { Actor } from "@badminton/auth-contracts";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { assertCenterManager } from "../../common/auth/center-access";
import { slotTime } from "../../common/domain/calendar";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { QuoteSelection } from "../../infrastructure/database/booking-records";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { OutboxService } from "../../infrastructure/outbox/outbox.service";
import { bookingView } from "./booking.mapper";
@Injectable()
export class BookingsCommandService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}
  async confirm(actor: Actor, id: string) {
    const initial = await this.prisma.reservation.findUnique({ where: { id } });
    if (!initial || initial.userId !== actor.userId)
      throw new NotFoundException("Không tìm thấy giữ chỗ");
    const result = await this.transactions.run("confirm", async (tx) => {
      await this.transactions.lock(tx, initial.centerId);
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
        await this.transactions.releaseExpired(tx, reservation.centerId);
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
      await this.outbox.record(
        tx,
        booking,
        reservation,
        "booking.confirmed.v1",
      );
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
    return bookingView(result.booking!);
  }
  async hide(actor: Actor, id: string) {
    return this.transactions.run("hide", async (tx) => {
      const row = await tx.booking.findUnique({
        where: { id },
        include: { reservation: { include: { center: true } } },
      });
      if (!row) throw new NotFoundException("Không tìm thấy booking");
      await this.transactions.lock(tx, row.reservation.centerId);
      const current = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: { reservation: { include: { center: true } } },
      });
      if (current.reservation.userId !== actor.userId)
        throw new ForbiddenException("Chỉ chủ booking được ẩn lịch sử");
      if (
        current.status === "CONFIRMED" &&
        (current.reservation.selections as unknown as QuoteSelection[]).some(
          (s) =>
            s.slots.some(
              (minute) =>
                slotTime(current.reservation.date, minute + 60) >
                this.clock.now(),
            ),
        )
      )
        throw new ConflictException(
          "Hãy hủy booking tương lai trước khi xóa khỏi lịch sử",
        );
      return bookingView(
        await tx.booking.update({
          where: { id },
          data: { hiddenAt: this.clock.now() },
          include: { reservation: { include: { center: true } } },
        }),
      );
    });
  }
  async cancel(actor: Actor, id: string) {
    const initial = await this.prisma.booking.findUnique({
      where: { id },
      include: { reservation: { include: { center: true } } },
    });
    if (!initial) throw new NotFoundException("Không tìm thấy booking");
    if (initial.reservation.userId !== actor.userId)
      assertCenterManager(actor, initial.reservation.center);
    const result = await this.transactions.run("cancel", async (tx) => {
      await this.transactions.lock(tx, initial.reservation.centerId);
      const current = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: { reservation: { include: { center: true } } },
      });
      if (current.reservation.userId !== actor.userId)
        assertCenterManager(actor, current.reservation.center);
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
      await this.outbox.record(
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
    return bookingView(result.booking);
  }
}
