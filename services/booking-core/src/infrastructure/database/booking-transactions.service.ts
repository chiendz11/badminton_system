import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Tx } from "./booking-records";
import { Prisma } from "../../../generated/client";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { PrismaService } from "./prisma.service";
@Injectable()
export class BookingTransactions {
  private readonly expirations = new WeakMap<object, number>();
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
  ) {}
  async lock(tx: Tx, key: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key.toLowerCase()},0))::text`;
  }
  async run<T>(operation: string, work: (tx: Tx) => Promise<T>): Promise<T> {
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
  async releaseExpired(tx: Tx, centerId: string) {
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
}
