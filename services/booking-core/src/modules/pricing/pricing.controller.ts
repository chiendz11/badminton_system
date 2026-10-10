import {
  Body,
  Controller,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { PricingDto } from "./dto/pricing.dto";
import { PricingService } from "./pricing.service";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/centers")
export class PricingController {
  constructor(
    @Inject(PricingService) private readonly service: PricingService,
  ) {}
  @Put(":id/pricing") @UseGuards(AuthGuard) pricing(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Body() data: PricingDto,
  ) {
    return this.service.pricing(req.actor, id, data.bands);
  }
}
