import { Controller, Get, Post, Body, Param, Headers, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentMethod } from './entities/invoice.entity';

@Controller('commerce/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Post(':id/pay')
  pay(
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod?: PaymentMethod,
  ) {
    return this.invoicesService.payInvoice(id, paymentMethod);
  }

  @Get('me')
  findMyInvoices(
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    // Ưu tiên lấy x-user-id từ API Gateway truyền xuống, fallback qua query khi test Postman
    const userId = headerUserId || queryUserId || 'test-user';
    return this.invoicesService.findByUser(userId);
  }

  // --- Lắng nghe sự kiện từ Booking Service qua RabbitMQ ---
  @EventPattern('booking.created')
  async handleBookingCreated(@Payload() data: { bookingId: string; userId: string; amount: number }) {
    await this.invoicesService.create({
      userId: data.userId,
      bookingId: data.bookingId,
      bookingAmount: data.amount,
      items: [],
    });
  }

  @EventPattern('booking.cancelled')
  async handleBookingCancelled(@Payload() data: { bookingId: string }) {
    await this.invoicesService.cancelByBookingId(data.bookingId);
  }
}