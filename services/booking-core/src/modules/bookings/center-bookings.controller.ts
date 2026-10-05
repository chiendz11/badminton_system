import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { ListDto } from "../../common/http/list.dto";
import { BookingsQueryService } from "./bookings-query.service";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/centers")
export class CenterBookingsController {
  constructor(
    @Inject(BookingsQueryService)
    private readonly service: BookingsQueryService,
  ) {}
  @Get(":id/bookings") @UseGuards(AuthGuard) bookings(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Query() query: ListDto,
  ) {
    return this.service.listBookings(req.actor, query, id);
  }
}
