import { Module } from "@nestjs/common";
import { OutboxModule } from "../../infrastructure/outbox/outbox.module";
import { AvailabilityModule } from "../availability/availability.module";
import { CentersModule } from "../centers/centers.module";
import { BookingsCommandService } from "./bookings-command.service";
import { BookingsQueryService } from "./bookings-query.service";
import { BookingsController } from "./bookings.controller";
import { CenterBookingsController } from "./center-bookings.controller";
import { FixedBookingsService } from "./fixed-bookings.service";
@Module({
  imports: [CentersModule, AvailabilityModule, OutboxModule],
  providers: [
    BookingsQueryService,
    BookingsCommandService,
    FixedBookingsService,
  ],
  controllers: [BookingsController, CenterBookingsController],
  exports: [BookingsCommandService],
})
export class BookingsModule {}
