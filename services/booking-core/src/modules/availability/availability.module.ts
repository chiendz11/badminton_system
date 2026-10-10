import { Module } from "@nestjs/common";
import { CentersModule } from "../centers/centers.module";
import { AvailabilityController } from "./availability.controller";
import { AvailabilityService } from "./availability.service";
import { CenterAvailabilityController } from "./center-availability.controller";
import { SlotAllocationService } from "./slot-allocation.service";
@Module({
  imports: [CentersModule],
  providers: [AvailabilityService, SlotAllocationService],
  controllers: [AvailabilityController, CenterAvailabilityController],
  exports: [AvailabilityService, SlotAllocationService],
})
export class AvailabilityModule {}
