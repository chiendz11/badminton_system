import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceItem, InvoiceStatus, PaymentMethod } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ProductsService } from '../products/products.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    private readonly productsService: ProductsService,
    private readonly messagingService: MessagingService,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const resolvedItems: InvoiceItem[] = [];
    let itemsTotal = 0;

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const product = await this.productsService.findById(item.productId);
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho`);
        }
        resolvedItems.push({
          productId: product._id.toString(),
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
        });
        itemsTotal += product.price * item.quantity;
      }
    }

    const bookingAmount = dto.bookingAmount || 0;
    const totalAmount = itemsTotal + bookingAmount;

    const newInvoice = new this.invoiceModel({
      userId: dto.userId,
      bookingId: dto.bookingId || null,
      items: resolvedItems,
      bookingAmount,
      totalAmount,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      status: InvoiceStatus.PENDING,
    });

    return newInvoice.save();
  }

  async payInvoice(id: string, paymentMethod?: PaymentMethod): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id).exec();
    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn ID: ${id}`);
    }
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException(`Hóa đơn đang ở trạng thái ${invoice.status}, không thể thanh toán`);
    }

    // Trừ tồn kho các sản phẩm đã mua
    for (const item of invoice.items) {
      await this.productsService.decrementStock(item.productId, item.quantity);
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    if (paymentMethod) invoice.paymentMethod = paymentMethod;

    const savedInvoice = await invoice.save();

    // Bắn event sang Booking Service & Notification Service
    this.messagingService.emitEvent('invoice.paid', {
      invoiceId: savedInvoice._id.toString(),
      bookingId: savedInvoice.bookingId,
      userId: savedInvoice.userId,
      totalAmount: savedInvoice.totalAmount,
      paidAt: savedInvoice.paidAt,
    });

    return savedInvoice;
  }

  async findByUser(userId: string): Promise<InvoiceDocument[]> {
    return this.invoiceModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async cancelByBookingId(bookingId: string): Promise<void> {
    await this.invoiceModel.updateMany(
      { bookingId, status: InvoiceStatus.PENDING },
      { $set: { status: InvoiceStatus.CANCELLED } },
    );
  }
}