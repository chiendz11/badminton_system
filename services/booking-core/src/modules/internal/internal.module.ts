import { Module } from "@nestjs/common";
import { InternalTokenGuard } from "../../common/auth/internal-token.guard";
import { IdentityClientService } from "./identity-client.service";
import { InternalBookingController } from "./internal-booking.controller";

@Module({
  providers: [InternalTokenGuard, IdentityClientService],
  controllers: [InternalBookingController],
  exports: [IdentityClientService],
})
export class InternalModule {}
