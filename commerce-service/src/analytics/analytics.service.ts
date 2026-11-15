import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from '../invoices/entities/invoice.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async getRevenue(
    startDate?: string,
    endDate?: string,
    groupBy: 'day' | 'month' | 'year' = 'day',
  ) {
    const matchStage: any = { status: InvoiceStatus.PAID };

    if (startDate || endDate) {
      matchStage.paidAt = {};
      if (startDate) matchStage.paidAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.paidAt.$lte = end;
      }
    }

    const dateFormatMap = {
      day: '%Y-%m-%d',
      month: '%Y-%m',
      year: '%Y',
    };
    const format = dateFormatMap[groupBy] || '%Y-%m-%d';

    const breakdown = await this.invoiceModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format, date: '$paidAt' } },
          totalRevenue: { $sum: '$totalAmount' },
          bookingRevenue: { $sum: '$bookingAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          totalRevenue: 1,
          bookingRevenue: 1,
          productRevenue: { $subtract: ['$totalRevenue', '$bookingRevenue'] },
          invoiceCount: 1,
        },
      },
    ]);

    const summary = breakdown.reduce(
      (acc, cur) => ({
        totalRevenue: acc.totalRevenue + cur.totalRevenue,
        bookingRevenue: acc.bookingRevenue + cur.bookingRevenue,
        productRevenue: acc.productRevenue + cur.productRevenue,
        totalInvoices: acc.totalInvoices + cur.invoiceCount,
      }),
      { totalRevenue: 0, bookingRevenue: 0, productRevenue: 0, totalInvoices: 0 },
    );

    return { summary, breakdown };
  }
}