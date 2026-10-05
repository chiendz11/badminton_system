import { Module } from "@nestjs/common";
import { CentersModule } from "../centers/centers.module";
import { CourtsController } from "./courts.controller";
import { CourtsService } from "./courts.service";
@Module({
  imports: [CentersModule],
  providers: [CourtsService],
  controllers: [CourtsController],
  exports: [],
})
export class CourtsModule {}
