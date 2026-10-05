import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { AvailabilityService } from "./availability.service";
import { AvailabilityDto } from "./dto/availability.dto";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/centers")
export class CenterAvailabilityController {
  constructor(
    @Inject(AvailabilityService) private readonly service: AvailabilityService,
  ) {}
  @Get(":id/availability") availability(
    @Param("id", uuid) id: string,
    @Query() query: AvailabilityDto,
  ) {
    return this.service.availability(id, query.date);
  }
}
