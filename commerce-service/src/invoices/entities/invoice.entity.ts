import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true })
  userId: string;

  @Prop({ default: null })
  bookingId?: string;

  @Prop({ type: [InvoiceItem], default: [] })
  items: InvoiceItem[];

  @Prop({ default: 0, min: 0 })
  bookingAmount: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Prop({ default: null })
  paidAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);