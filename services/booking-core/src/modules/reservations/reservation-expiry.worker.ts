import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
@Injectable()
export class ReservationExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
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
  async expire() {
    const centers = await this.prisma.reservation.findMany({
      where: { status: "HELD", expiresAt: { lte: this.clock.now() } },
      select: { centerId: true },
      distinct: ["centerId"],
      take: 100,
    });
    for (const { centerId } of centers) {
      await this.transactions.run("expire", async (tx) => {
        await this.transactions.lock(tx, centerId);
        return this.transactions.releaseExpired(tx, centerId);
      });
    }
  }
}
