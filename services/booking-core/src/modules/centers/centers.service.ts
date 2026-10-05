import type { Actor } from "@badminton/auth-contracts";
import type { PricingBand } from "@badminton/booking-contracts";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../generated/client";
import { assertCenterManager } from "../../common/auth/center-access";
import { validateBands } from "../../common/domain/pricing";
import { ListDto } from "../../common/http/list.dto";
import { Clock, Telemetry } from "../../common/observability/telemetry";
import { Tx } from "../../infrastructure/database/booking-records";
import { BookingTransactions } from "../../infrastructure/database/booking-transactions.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CENTER_INCLUDE } from "./center.select";
import { CenterDto, UpdateCenterDto } from "./dto/center.dto";
@Injectable()
export class CentersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BookingTransactions)
    private readonly transactions: BookingTransactions,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(Telemetry) private readonly telemetry: Telemetry,
  ) {}
  async getInTransaction(tx: Tx, id: string) {
    const center = await tx.center.findUnique({
      where: { id },
      include: CENTER_INCLUDE,
    });
    if (!center) throw new NotFoundException("Không tìm thấy trung tâm");
    return center;
  }
  async listCenters(query: ListDto, actor?: Actor) {
    if (query.managed === "true" && (!actor || actor.role === "user"))
      throw new ForbiddenException("Cần đăng nhập để xem trung tâm quản lý");
    const where: Prisma.CenterWhereInput = {
      ...(query.managed === "true"
        ? actor?.role === "super_admin"
          ? {}
          : { managerId: actor?.userId }
        : { isActive: true }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { address: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.center.findMany({
        where,
        include: CENTER_INCLUDE,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.center.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async center(id: string) {
    return this.getInTransaction(this.prisma, id);
  }
  async createCenter(actor: Actor, data: CenterDto) {
    if (actor.role !== "super_admin")
      throw new ForbiddenException("Chỉ admin hệ thống được tạo trung tâm");
    const { pricePerHour, ...fields } = data;
    const bands: PricingBand[] = ["WEEKDAY", "WEEKEND"].map((dayType) => ({
      dayType: dayType as PricingBand["dayType"],
      startMinute: data.openMinute,
      endMinute: data.closeMinute,
      pricePerHour,
    }));
    validateBands(bands, data.openMinute, data.closeMinute);
    const center = await this.prisma.center.create({
      data: { ...fields, pricing: { create: bands } },
      include: CENTER_INCLUDE,
    });
    this.telemetry.event("center_created", {
      centerId: center.id,
      actorId: actor.userId,
    });
    return center;
  }
  async updateCenter(actor: Actor, id: string, data: UpdateCenterDto) {
    const result = await this.transactions.run("center_update", async (tx) => {
      await this.transactions.lock(tx, id);
      const center = await this.getInTransaction(tx, id);
      assertCenterManager(actor, center);
      await this.transactions.releaseExpired(tx, id);
      if (
        data.isActive === false &&
        (await tx.slotAllocation.count({
          where: { court: { centerId: id }, endsAt: { gt: this.clock.now() } },
        }))
      )
        throw new ConflictException(
          "Trung tâm còn lịch giữ chỗ hoặc booking tương lai",
        );
      return tx.center.update({ where: { id }, data, include: CENTER_INCLUDE });
    });
    this.telemetry.event("center_updated", {
      centerId: id,
      actorId: actor.userId,
    });
    return result;
  }
}
