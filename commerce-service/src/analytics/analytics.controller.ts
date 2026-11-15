import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('commerce/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue')
  getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'month' | 'year',
  ) {
    return this.analyticsService.getRevenue(startDate, endDate, groupBy);
  }
}