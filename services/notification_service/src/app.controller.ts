import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { AppService } from './app.service';
import { Channel, Message } from 'amqplib';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('booking.created')
  async handleBookingCreated(@Payload() data: any, @Ctx() context: any) {
    const channel = context.getChannelRef() as Channel;
    const originalMsg = context.getMessage() as Message;

    try {
      await this.appService.processNotificationEvent(data);
      channel.ack(originalMsg);
    } catch (error) {
      console.error('Error processing notification event:', error);
      channel.nack(originalMsg, false, false);
    }
  }
}