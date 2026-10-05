import type { Actor } from "@badminton/auth-contracts";
import { discountedQuote } from "@badminton/booking-contracts";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../generated/client";
import { quoteSlots } from "../../common/domain/booking-quote";
import { slotTime } from "../../common/domain/calendar";
import {
  canonicalSelections,
  fingerprint,
} from "../../common/domain/selections";
import { idempotencyKey } from "../../common/http/idempotency-key";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { SlotAllocationService } from "../availability/slot-allocation.service";
import { CentersService } from "../centers/centers.service";
import { ReservationDto } from "./dto/reservation.dto";
@Injectable()
export class ReservationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
    @Inject(CentersService) private readonly centers: CentersService,
    @Inject(SlotAllocationService)
    private readonly allocations: SlotAllocationService,
  ) {}
  async held(actor: Actor, centerId?: string) {
    const items = await this.prisma.reservation.findMany({
      where: {
        userId: actor.userId,
        status: "HELD",
        expiresAt: { gt: this.clock.now() },
        ...(centerId ? { centerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return { items };
  }
  async reserve(actor: Actor, data: ReservationDto, key?: string) {
    const idem = idempotencyKey(key),
      details = canonicalSelections(data.selections),
      hash = fingerprint({
        centerId: data.centerId,
        date: data.date,
        selections: details,
      });
    const result = await this.transactions.run("reserve", async (tx) => {
      await this.transactions.lock(tx, `actor:${actor.userId}`);
      await this.transactions.lock(tx, `reservation:${actor.userId}:${idem}`);
      await this.transactions.lock(tx, data.centerId);
      await this.transactions.releaseExpired(tx, data.centerId);
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
      const center = await this.centers.getInTransaction(tx, data.centerId),
        selections = quoteSlots(center, this.clock.now(), data.date, details);
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
      await this.allocations.allocate(tx, reservation, selections);
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
  async release(actor: Actor, id: string) {
    const initial = await this.prisma.reservation.findUnique({ where: { id } });
    if (!initial || initial.userId !== actor.userId)
      throw new NotFoundException("Không tìm thấy giữ chỗ");
    const result = await this.transactions.run("release", async (tx) => {
      await this.transactions.lock(tx, initial.centerId);
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
}
