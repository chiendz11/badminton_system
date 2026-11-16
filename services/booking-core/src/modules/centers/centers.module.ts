import { Module } from "@nestjs/common";
import { OutboxModule } from "../../infrastructure/outbox/outbox.module";
import { InternalModule } from "../internal/internal.module";
import { CentersController } from "./centers.controller";
import { CentersService } from "./centers.service";
@Module({
  imports: [OutboxModule, InternalModule],
  providers: [CentersService],
  controllers: [CentersController],
  exports: [CentersService],
})
export class CentersModule {}
