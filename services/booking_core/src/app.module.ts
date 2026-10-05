import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { BookingService } from "./booking.service";
import { Clock, Telemetry } from "./telemetry";
import { AuthGuard } from "./auth";
import {
  AvailabilityController,
  CentersController,
  ReservationsController,
  BookingsController,
  DemoController,
  HealthController,
} from "./controllers";
@Module({
  controllers: [
    AvailabilityController,
    CentersController,
    ReservationsController,
    BookingsController,
    DemoController,
    HealthController,
  ],
  providers: [PrismaService, BookingService, Clock, Telemetry, AuthGuard],
})
export class AppModule {}
