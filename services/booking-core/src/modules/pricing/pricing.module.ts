import { Module } from "@nestjs/common";
import { CentersModule } from "../centers/centers.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
@Module({
  imports: [CentersModule],
  providers: [PricingService],
  controllers: [PricingController],
  exports: [],
})
export class PricingModule {}
