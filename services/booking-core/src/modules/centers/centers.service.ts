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
    const { pricePerHour, totalCourts, pricingBands, ...fields } = data;
    const bands: PricingBand[] =
      pricingBands ??
      ["WEEKDAY", "WEEKEND"].map((dayType) => ({
        dayType: dayType as PricingBand["dayType"],
        startMinute: data.openMinute,
        endMinute: data.closeMinute,
        pricePerHour,
      }));
    validateBands(bands, data.openMinute, data.closeMinute);
    const center = await this.prisma.center.create({
      data: {
        ...fields,
        pricing: { create: bands },
        courts: {
          create: Array.from({ length: totalCourts }, (_, index) => ({
            name: `Sân ${index + 1}`,
          })),
        },
      },
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
      const { totalCourts, pricingBands, managerId, ...fields } = data;
      if (managerId !== undefined && actor.role !== "super_admin")
        throw new ForbiddenException(
          "Chỉ admin hệ thống được phân công quản lý",
        );
      if (pricingBands)
        validateBands(pricingBands, center.openMinute, center.closeMinute);
      if (totalCourts !== undefined) {
        const active = center.courts
          .filter((c) => c.isActive)
          .sort((a, b) =>
            a.name.localeCompare(b.name, "vi", { numeric: true }),
          );
        if (totalCourts < active.length) {
          const closing = active.slice(totalCourts).map((c) => c.id);
          if (
            await tx.slotAllocation.count({
              where: {
                courtId: { in: closing },
                endsAt: { gt: this.clock.now() },
              },
            })
          )
            throw new ConflictException(
              "Không thể giảm số sân đang có lịch tương lai",
            );
          await tx.court.updateMany({
            where: { id: { in: closing } },
            data: { isActive: false },
          });
        } else if (totalCourts > active.length) {
          let remaining = totalCourts - active.length;
          const inactive = center.courts
            .filter((c) => !c.isActive)
            .slice(0, remaining);
          await tx.court.updateMany({
            where: { id: { in: inactive.map((c) => c.id) } },
            data: { isActive: true },
          });
          remaining -= inactive.length;
          const names = new Set(center.courts.map((c) => c.name));
          for (let number = 1; remaining > 0; number++) {
            const name = `Sân ${number}`;
            if (!names.has(name)) {
              await tx.court.create({ data: { centerId: id, name } });
              names.add(name);
              remaining--;
            }
          }
        }
      }
      return tx.center.update({
        where: { id },
        data: {
          ...fields,
          ...(managerId !== undefined ? { managerId } : {}),
          ...(pricingBands
            ? { pricing: { deleteMany: {}, create: pricingBands } }
            : {}),
        },
        include: CENTER_INCLUDE,
      });
    });
    this.telemetry.event("center_updated", {
      centerId: id,
      actorId: actor.userId,
    });
    return result;
  }
}
