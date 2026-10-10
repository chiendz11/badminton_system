import type { Actor } from "@badminton/auth-contracts";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { assertCenterManager } from "../../common/auth/center-access";
import { Clock } from "../../common/observability/telemetry";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { CentersService } from "../centers/centers.service";
import { CourtDto, UpdateCourtDto } from "./dto/court.dto";
@Injectable()
export class CourtsService {
  constructor(
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(CentersService) private readonly centers: CentersService,
  ) {}
  async createCourt(actor: Actor, centerId: string, data: CourtDto) {
    return this.transactions.run("court_create", async (tx) => {
      await this.transactions.lock(tx, centerId);
      assertCenterManager(
        actor,
        await this.centers.getInTransaction(tx, centerId),
      );
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
    return this.transactions.run("court_update", async (tx) => {
      await this.transactions.lock(tx, centerId);
      assertCenterManager(
        actor,
        await this.centers.getInTransaction(tx, centerId),
      );
      const court = await tx.court.findFirst({ where: { id, centerId } });
      if (!court) throw new NotFoundException("Không tìm thấy sân");
      await this.transactions.releaseExpired(tx, centerId);
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
}
