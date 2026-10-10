import { Module } from "@nestjs/common";
import { CentersController } from "./centers.controller";
import { CentersService } from "./centers.service";
@Module({
  imports: [],
  providers: [CentersService],
  controllers: [CentersController],
  exports: [CentersService],
})
export class CentersModule {}
