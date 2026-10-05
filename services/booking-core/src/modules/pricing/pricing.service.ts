import type { Actor } from "@badminton/auth-contracts";
import type { PricingBand } from "@badminton/booking-contracts";
import { Inject, Injectable } from "@nestjs/common";
import { assertCenterManager } from "../../common/auth/center-access";
import { validateBands } from "../../common/domain/pricing";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { CentersService } from "../centers/centers.service";
@Injectable()
export class PricingService {
  constructor(
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(CentersService) private readonly centers: CentersService,
  ) {}
  async pricing(actor: Actor, centerId: string, bands: PricingBand[]) {
    return this.transactions.run("pricing_update", async (tx) => {
      await this.transactions.lock(tx, centerId);
      const center = await this.centers.getInTransaction(tx, centerId);
      assertCenterManager(actor, center);
      validateBands(bands, center.openMinute, center.closeMinute);
      await tx.pricingBand.deleteMany({ where: { centerId } });
      await tx.pricingBand.createMany({
        data: bands.map((b) => ({ ...b, centerId })),
      });
      return this.centers.getInTransaction(tx, centerId);
    });
  }
}
