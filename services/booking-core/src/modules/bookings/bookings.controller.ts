import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { ListDto } from "../../common/http/list.dto";
import { BookingsCommandService } from "./bookings-command.service";
import { BookingsQueryService } from "./bookings-query.service";
import { FixedBookingDto } from "./dto/fixed-booking.dto";
import { FixedBookingsService } from "./fixed-bookings.service";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/bookings")
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(
    @Inject(BookingsQueryService)
    private readonly service: BookingsQueryService,
    @Inject(BookingsCommandService)
    private readonly commands: BookingsCommandService,
    @Inject(FixedBookingsService)
    private readonly fixedBookings: FixedBookingsService,
  ) {}
  @Get("me") mine(@Req() req: AuthRequest, @Query() query: ListDto) {
    return this.service.listBookings(req.actor, query);
  }
  @Get("me/stats") stats(@Req() req: AuthRequest) {
    return this.service.stats(req.actor);
  }
  @Post("fixed") fixed(
    @Req() req: AuthRequest,
    @Body() data: FixedBookingDto,
    @Headers("idempotency-key") key?: string,
  ) {
    return this.fixedBookings.fixed(req.actor, data, key);
  }
  @Post(":id/cancel") @HttpCode(200) cancel(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
  ) {
    return this.commands.cancel(req.actor, id);
  }
}
