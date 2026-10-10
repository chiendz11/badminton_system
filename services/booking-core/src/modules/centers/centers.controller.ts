import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { verifyActor } from "../../common/auth/verify-actor";
import { ListDto } from "../../common/http/list.dto";
import { CentersService } from "./centers.service";
import { CenterDto, UpdateCenterDto } from "./dto/center.dto";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/centers")
export class CentersController {
  constructor(
    @Inject(CentersService) private readonly service: CentersService,
  ) {}
  @Get() list(@Query() query: ListDto, @Req() req: AuthRequest) {
    const actor = req.headers.authorization?.startsWith("Bearer ")
      ? verifyActor(req.headers.authorization.slice(7))
      : undefined;
    return this.service.listCenters(query, actor);
  }
  @Get(":id") get(@Param("id", uuid) id: string) {
    return this.service.center(id);
  }
  @Post() @UseGuards(AuthGuard) create(
    @Req() req: AuthRequest,
    @Body() data: CenterDto,
  ) {
    return this.service.createCenter(req.actor, data);
  }
  @Patch(":id") @UseGuards(AuthGuard) update(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Body() data: UpdateCenterDto,
  ) {
    return this.service.updateCenter(req.actor, id, data);
  }
}
