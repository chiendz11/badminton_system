import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { demoToken } from "./demo-session";
import { DemoDto } from "./demo-session.dto";

@Controller("api/v1/dev")
export class DemoController {
  @Post("session") @HttpCode(200) session(@Body() data: DemoDto) {
    return demoToken(data.profile);
  }
}
