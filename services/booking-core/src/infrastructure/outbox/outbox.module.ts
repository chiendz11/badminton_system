import { Module } from "@nestjs/common";
import { OutboxService } from "./outbox.service";
@Module({
  imports: [],
  providers: [OutboxService],
  controllers: [],
  exports: [OutboxService],
})
export class OutboxModule {}
