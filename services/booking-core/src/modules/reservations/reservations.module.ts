import { Module } from "@nestjs/common";
import { AvailabilityModule } from "../availability/availability.module";
import { BookingsModule } from "../bookings/bookings.module";
import { CentersModule } from "../centers/centers.module";
import { ReservationExpiryWorker } from "./reservation-expiry.worker";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
@Module({
  imports: [CentersModule, AvailabilityModule, BookingsModule],
  providers: [ReservationsService, ReservationExpiryWorker],
  controllers: [ReservationsController],
  exports: [],
})
export class ReservationsModule {}
