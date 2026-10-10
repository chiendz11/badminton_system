import { DevelopmentModule } from "./modules/development/development.module";
import { Module } from "@nestjs/common";
import { AuthModule } from "./common/auth/auth.module";
import { ObservabilityModule } from "./common/observability/observability.module";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { CentersModule } from "./modules/centers/centers.module";
import { CourtsModule } from "./modules/courts/courts.module";
import { HealthModule } from "./modules/health/health.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { ReservationsModule } from "./modules/reservations/reservations.module";
@Module({
  imports: [
    ObservabilityModule,
    DatabaseModule,
    AuthModule,
    CentersModule,
    CourtsModule,
    PricingModule,
    AvailabilityModule,
    BookingsModule,
    ReservationsModule,
    HealthModule,
    ...(process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEMO_AUTH === "true"
      ? [DevelopmentModule]
      : []),
  ],
  providers: [],
  controllers: [],
  exports: [],
})
export class AppModule {}
