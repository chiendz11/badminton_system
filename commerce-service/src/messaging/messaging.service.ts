import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  emitEvent(pattern: string, payload: any) {
    this.logger.log(`Bắn sự kiện [${pattern}]: ${JSON.stringify(payload)}`);
    this.client.emit(pattern, payload);
  }
}