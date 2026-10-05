import { Global, Module } from "@nestjs/common";
import { BookingTransactions } from "./booking-transactions.service";
import { PrismaService } from "./prisma.service";
@Global()
@Module({
  imports: [],
  providers: [PrismaService, BookingTransactions],
  controllers: [],
  exports: [PrismaService, BookingTransactions],
})
export class DatabaseModule {}
