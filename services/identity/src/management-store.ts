import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../generated/client";
import type { DirectoryUser, ManagementStore } from "./management";

const selectUser = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  isVerified: true,
  version: true,
  profile: { select: { name: true, phone: true } },
} satisfies Prisma.UserSelect;
type SelectedUser = Prisma.UserGetPayload<{ select: typeof selectUser }>;
function publicUser(user: SelectedUser): DirectoryUser {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isVerified: user.isVerified,
    version: user.version,
    name: user.profile?.name ?? user.email,
    phone: user.profile?.phone ?? null,
  };
}

export function createManagementStore(prisma: PrismaClient): ManagementStore {
  return {
    byId: (id) =>
      prisma.user.findUnique({ where: { id }, include: { profile: true } }),
    profile: async (id) => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: selectUser,
      });
      return user ? publicUser(user) : null;
    },
    updateProfile: (id, patch) =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id } });
        await tx.profile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            name: patch.name ?? user.email,
            phone: patch.phone,
          },
          update: patch,
        });
        return publicUser(
          await tx.user.update({
            where: { id },
            data: { version: { increment: 1 } },
            select: selectUser,
          }),
        );
      }),
    list: async ({ role, isActive, search, offset, limit }) => {
      const where: Prisma.UserWhereInput = {
        role,
        isActive,
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                {
                  profile: { name: { contains: search, mode: "insensitive" } },
                },
              ],
            }
          : {}),
      };
      const [users, total] = await prisma.$transaction(
        [
          prisma.user.findMany({
            where,
            select: selectUser,
            skip: offset,
            take: limit,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          }),
          prisma.user.count({ where }),
        ],
        { isolationLevel: "RepeatableRead" },
      );
      return { users: users.map(publicUser), total };
    },
    changeUser: (actorId, userId, patch, reason, correlationId) =>
      prisma.$transaction(async (tx) => {
        // Serialize account changes with session creation and manager assignment.
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
        if (!rows.length) return null;
        const before = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: selectUser,
        });
        const user = await tx.user.update({
          where: { id: userId },
          data: { ...patch, version: { increment: 1 } },
          select: selectUser,
        });
        const now = new Date();
        if (patch.isActive === false || patch.role !== undefined) {
          await tx.session.updateMany({
            where: { userId, revokedAt: null, expiresAt: { gt: now } },
            data: { revokedAt: now },
          });
        }
        if (
          patch.isActive === false ||
          (patch.role !== undefined && patch.role !== "center_manager")
        ) {
          await tx.centerAssignment.updateMany({
            where: { userId, active: true },
            data: { active: false },
          });
        }
        await tx.identityAudit.create({
          data: {
            actorId,
            userId,
            action: patch.role === undefined ? "status" : "role",
            reason,
            before: { role: before.role, isActive: before.isActive },
            after: { role: user.role, isActive: user.isActive },
          },
        });
        const id = randomUUID();
        const event = {
          id,
          type: "identity.user-updated.v1",
          aggregateId: userId,
          createdAt: now.toISOString(),
          schemaVersion: 1,
          producer: "identity-service",
          correlationId: correlationId?.slice(0, 128) || id,
          payload: {
            userId,
            isActive: user.isActive,
            role: user.role,
            version: user.version,
          },
        };
        await tx.identityOutbox.create({
          data: { id, userId, version: user.version, event },
        });
        return publicUser(user);
      }),
    assign: (actorId, assignment) =>
      prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${assignment.userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: assignment.userId },
        });
        if (!user?.isActive || user.role !== "center_manager") return false;
        await tx.centerAssignment.upsert({
          where: { centerId: assignment.centerId },
          create: { ...assignment, assignedBy: actorId },
          update: { ...assignment, assignedBy: actorId },
        });
        return true;
      }),
  };
}
