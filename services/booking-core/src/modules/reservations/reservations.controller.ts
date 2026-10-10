import {
  Body,
  Get,
  Query,
  Controller,
  Delete,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { BookingsCommandService } from "../bookings/bookings-command.service";
import { ReservationDto } from "./dto/reservation.dto";
import { ReservationsService } from "./reservations.service";
import { ListDto } from "../../common/http/list.dto";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/reservations")
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(
    @Inject(ReservationsService) private readonly service: ReservationsService,
    @Inject(BookingsCommandService)
    private readonly bookings: BookingsCommandService,
  ) {}
  @Get() held(@Req() req: AuthRequest, @Query() query: ListDto) {
    return this.service.held(req.actor, query.centerId);
  }
  @Post() reserve(
    @Req() req: AuthRequest,
    @Body() data: ReservationDto,
    @Headers("idempotency-key") key?: string,
  ) {
    return this.service.reserve(req.actor, data, key);
  }
  @Post(":id/confirm") @HttpCode(200) confirm(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
  ) {
    return this.bookings.confirm(req.actor, id);
  }
  @Delete(":id") release(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
  ) {
    return this.service.release(req.actor, id);
  }
}
