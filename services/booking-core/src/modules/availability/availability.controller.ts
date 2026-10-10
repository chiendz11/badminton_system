import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AuthRequest } from "../../common/auth/auth.types";
import { AvailabilityService } from "./availability.service";
import { FixedRangeDto } from "./dto/availability.dto";

@Controller("api/v1/availability")
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(
    @Inject(AvailabilityService) private readonly service: AvailabilityService,
  ) {}
  @Post("fixed") @HttpCode(200) fixed(
    @Req() req: AuthRequest,
    @Body() data: FixedRangeDto,
  ) {
    return this.service.fixedAvailability(req.actor, data);
  }
}
