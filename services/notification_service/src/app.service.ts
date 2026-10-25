import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async processNotificationEvent(eventData: any) {
    const { eventId, userId, title, message, deepLinkMetadata } = eventData;

    // Kiểm tra Idempotent (chống trùng lặp)
    if (eventId) {
      const existingNotification = await this.notificationModel.findOne({ eventId });
      if (existingNotification) {
        console.log(`Duplicate event detected (eventId: ${eventId}). Skipping.`);
        return;
      }
    }

    // Tạo mới thông báo
    const newNotification = new this.notificationModel({
      userId,
      title,
      message,
      deepLinkMetadata,
      eventId,
    });

    await newNotification.save();
    console.log(`Notification successfully created for user ${userId}`);
  }
}