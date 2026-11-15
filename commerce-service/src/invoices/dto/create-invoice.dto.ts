import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/invoice.entity';

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bookingAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  @IsOptional()
  items?: InvoiceItemDto[];

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}