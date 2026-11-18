import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InternalTokenGuard } from "../../common/auth/internal-token.guard";
import { calendarDate, vietnamDate } from "../../common/domain/calendar";
import { Clock } from "../../common/observability/telemetry";
import { PrismaService } from "../../infrastructure/database/prisma.service";

const uuid = new ParseUUIDPipe({ version: "4" });

@Controller("internal/booking")
@UseGuards(InternalTokenGuard)
export class InternalBookingController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Get("centers/:centerId/ownership")
  async ownership(
    @Param("centerId", uuid) centerId: string,
    @Query("managerId") managerId?: string,
  ) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, name: true, managerId: true, isActive: true },
    });
    if (!center) throw new NotFoundException("Không tìm thấy trung tâm");
    return {
      centerId: center.id,
      name: center.name,
      managerId: center.managerId,
      isActive: center.isActive,
      ...(managerId !== undefined
        ? { isManager: center.managerId === managerId }
        : {}),
    };
  }

  @Get("centers/:centerId/customers")
  async customersOnDate(
    @Param("centerId", uuid) centerId: string,
    @Query("date") dateParam?: string,
  ) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true },
    });
    if (!center) throw new NotFoundException("Không tìm thấy trung tâm");

    const date = dateParam
      ? calendarDate(dateParam)
      : vietnamDate(this.clock.now());
    const rows = await this.prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        reservation: { centerId, date },
      },
      select: { reservation: { select: { userId: true } } },
    });
    const userIds = Array.from(
      new Set(rows.map((row) => row.reservation.userId)),
    ).sort();
    return { centerId, date, userIds };
  }

  @Get("centers/:centerId/eligibility")
  async reviewEligibility(
    @Param("centerId", uuid) centerId: string,
    @Query("userId") userId?: string,
  ) {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
      throw new BadRequestException("userId là bắt buộc");
    }
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true },
    });
    if (!center) throw new NotFoundException("Không tìm thấy trung tâm");

    const count = await this.prisma.booking.count({
      where: {
        status: "CONFIRMED",
        reservation: { centerId, userId: normalizedUserId },
      },
    });
    return {
      centerId,
      userId: normalizedUserId,
      hasConfirmedBooking: count > 0,
    };
  }
}
