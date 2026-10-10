import {
  Body,
  Controller,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { CourtsService } from "./courts.service";
import { CourtDto, UpdateCourtDto } from "./dto/court.dto";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/centers")
export class CourtsController {
  constructor(@Inject(CourtsService) private readonly service: CourtsService) {}
  @Post(":id/courts") @UseGuards(AuthGuard) court(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Body() data: CourtDto,
  ) {
    return this.service.createCourt(req.actor, id, data);
  }
  @Patch(":id/courts/:courtId") @UseGuards(AuthGuard) updateCourt(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Param("courtId", uuid) courtId: string,
    @Body() data: UpdateCourtDto,
  ) {
    return this.service.updateCourt(req.actor, id, courtId, data);
  }
}
