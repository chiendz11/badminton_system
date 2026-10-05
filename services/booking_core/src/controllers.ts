import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Delete,
  Query,
  Req,
  Res,
  UseGuards,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response } from "express";
import { BookingService } from "./booking.service";
import { AuthGuard, type AuthRequest, demoToken, verifyActor } from "./auth";
import {
  AvailabilityDto,
  CenterDto,
  CourtDto,
  DemoDto,
  FixedBookingDto,
  FixedRangeDto,
  ListDto,
  PricingDto,
  ReservationDto,
  UpdateCenterDto,
  UpdateCourtDto,
} from "./dto";
import { PrismaService } from "./prisma.service";
import { Clock, Telemetry } from "./telemetry";
const uuid = new ParseUUIDPipe({ version: "4" });
@Controller("api/v1/centers")
export class CentersController {
  constructor(
    @Inject(BookingService) private readonly service: BookingService,
  ) {}
  @Get() list(@Query() query: ListDto, @Req() req: AuthRequest) {
    const actor = req.headers.authorization?.startsWith("Bearer ")
      ? verifyActor(req.headers.authorization.slice(7))
      : undefined;
    return this.service.listCenters(query, actor);
  }
  @Get(":id") get(@Param("id", uuid) id: string) {
    return this.service.center(id);
  }
  @Get(":id/availability") availability(
    @Param("id", uuid) id: string,
    @Query() query: AvailabilityDto,
  ) {
    return this.service.availability(id, query.date);
  }
  @Post() @UseGuards(AuthGuard) create(
    @Req() req: AuthRequest,
    @Body() data: CenterDto,
  ) {
    return this.service.createCenter(req.actor, data);
  }
  @Patch(":id") @UseGuards(AuthGuard) update(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Body() data: UpdateCenterDto,
  ) {
    return this.service.updateCenter(req.actor, id, data);
  }
  @Post(":id/courts") @UseGuards(AuthGuard) court(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Body() data: CourtDto,
  ) {
    return this.service.createCourt(req.actor, id, data);
  }
  @Patch(":id/courts/:courtId") @UseGuards(AuthGuard) updateCourt(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Param("courtId", uuid) courtId: string,
    @Body() data: UpdateCourtDto,
  ) {
    return this.service.updateCourt(req.actor, id, courtId, data);
  }
  @Put(":id/pricing") @UseGuards(AuthGuard) pricing(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Body() data: PricingDto,
  ) {
    return this.service.pricing(req.actor, id, data.bands);
  }
  @Get(":id/bookings") @UseGuards(AuthGuard) bookings(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
    @Query() query: ListDto,
  ) {
    return this.service.listBookings(req.actor, query, id);
  }
}
@Controller("api/v1/reservations")
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(
    @Inject(BookingService) private readonly service: BookingService,
  ) {}
  @Post() reserve(
    @Req() req: AuthRequest,
    @Body() data: ReservationDto,
    @Headers("idempotency-key") key?: string,
  ) {
    return this.service.reserve(req.actor, data, key);
  }
  @Post(":id/confirm") @HttpCode(200) confirm(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
  ) {
    return this.service.confirm(req.actor, id);
  }
  @Delete(":id") release(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
  ) {
    return this.service.release(req.actor, id);
  }
}
@Controller("api/v1/bookings")
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(
    @Inject(BookingService) private readonly service: BookingService,
  ) {}
  @Get("me") mine(@Req() req: AuthRequest, @Query() query: ListDto) {
    return this.service.listBookings(req.actor, query);
  }
  @Get("me/stats") stats(@Req() req: AuthRequest) {
    return this.service.stats(req.actor);
  }
  @Post("fixed") fixed(
    @Req() req: AuthRequest,
    @Body() data: FixedBookingDto,
    @Headers("idempotency-key") key?: string,
  ) {
    return this.service.fixed(req.actor, data, key);
  }
  @Post(":id/cancel") @HttpCode(200) cancel(
    @Req() req: AuthRequest,
    @Param("id", uuid) id: string,
  ) {
    return this.service.cancel(req.actor, id);
  }
}
@Controller("api/v1/dev")
export class DemoController {
  @Post("session") @HttpCode(200) session(@Body() data: DemoDto) {
    return demoToken(data.profile);
  }
}
@Controller()
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
    @Inject(Clock) private readonly clock: Clock,
  ) {}
  @Get("health/live") live() {
    return { status: "ok", service: "booking-core" };
  }
  @Get("health/ready") async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
  @Get("metrics") async metrics(
    @Headers("authorization") authorization: string | undefined,
    @Res() res: Response,
  ) {
    if (
      process.env.METRICS_TOKEN &&
      authorization !== `Bearer ${process.env.METRICS_TOKEN}`
    )
      throw new UnauthorizedException();
    try {
      const [holds, pending] = await Promise.all([
        this.prisma.reservation.count({
          where: { status: "HELD", expiresAt: { gt: this.clock.now() } },
        }),
        this.prisma.outboxEvent.count({ where: { publishedAt: null } }),
      ]);
      this.telemetry.metrics.activeHolds.set(holds);
      this.telemetry.metrics.outboxPending.set(pending);
      this.telemetry.metrics.databaseUp.set(1);
    } catch {
      this.telemetry.metrics.databaseUp.set(0);
    }
    res
      .type(this.telemetry.metrics.registry.contentType)
      .send(await this.telemetry.metrics.registry.metrics());
  }
}

@Controller("api/v1/availability")
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(
    @Inject(BookingService) private readonly service: BookingService,
  ) {}
  @Post("fixed") @HttpCode(200) fixed(
    @Req() req: AuthRequest,
    @Body() data: FixedRangeDto,
  ) {
    return this.service.fixedAvailability(req.actor, data);
  }
}
