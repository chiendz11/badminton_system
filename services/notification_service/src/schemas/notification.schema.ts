import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Object })
  deepLinkMetadata: {
    type: string; // Ví dụ: 'BOOKING_DETAIL', 'CENTER_INFO'
    targetId: string; // ID định danh (vd: bookingId)
    urlPath?: string;
  };

  @Prop({ unique: true, sparse: true })
  eventId: string; // Trường cốt lõi để làm Idempotent Consumer
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);