import {
  Controller,
  Get,
  Headers,
  Inject,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response } from "express";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { PrismaService } from "../../infrastructure/database/prisma.service";

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
