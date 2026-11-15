import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'badminton_events_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}