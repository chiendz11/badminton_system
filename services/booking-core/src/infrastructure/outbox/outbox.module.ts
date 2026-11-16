import { Module } from "@nestjs/common";
import { AmqpOutboxPublisher, OUTBOX_PUBLISHER } from "./outbox-publisher";
import { OutboxRelayWorker } from "./outbox-relay.worker";
import { OutboxService } from "./outbox.service";

@Module({
  imports: [],
  providers: [
    OutboxService,
    { provide: OUTBOX_PUBLISHER, useClass: AmqpOutboxPublisher },
    OutboxRelayWorker,
  ],
  controllers: [],
  exports: [OutboxService, OUTBOX_PUBLISHER, OutboxRelayWorker],
})
export class OutboxModule {}
