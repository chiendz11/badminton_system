import type { Prisma, PrismaClient } from "../generated/client";

export const emailVerificationEligibility = {
  // Pre-existing accounts may be unverified but have no registration token.
  OR: [{ isVerified: true }, { verificationTokens: { none: {} } }],
} satisfies Prisma.UserWhereInput;

type LockedSession = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function createSessionStore(prisma: PrismaClient) {
  return {
    createSession: async (userId: string, tokenHash: string, expiresAt: Date) => {
      await prisma.session.create({
        data: {
          userId,
          expiresAt,
          refreshTokens: { create: { tokenHash, expiresAt } },
        },
        select: { id: true },
      });
    },

    revokeSession: async (tokenHash: string) => {
      // Update the same session row locked by refresh, including when the cookie was just rotated.
      await prisma.session.updateMany({
        where: { revokedAt: null, refreshTokens: { some: { tokenHash } } },
        data: { revokedAt: new Date() },
      });
    },

    rotateSession: (tokenHash: string, replacementHash: string) =>
      prisma.$transaction(async (tx) => {
        const token = await tx.refreshToken.findUnique({
          where: { tokenHash },
          select: { sessionId: true },
        });
        if (!token) return null;

        const [session] = await tx.$queryRaw<LockedSession[]>`
          SELECT id, "userId", "expiresAt", "revokedAt"
          FROM "Session"
          WHERE id = ${token.sessionId}::uuid
          FOR UPDATE
        `;
        const now = new Date();
        if (!session || session.revokedAt || session.expiresAt <= now) return null;

        // Re-read after the lock so a concurrent refresh cannot consume the same token twice.
        const current = await tx.refreshToken.findUnique({
          where: { tokenHash },
          select: { expiresAt: true, consumedAt: true },
        });
        if (!current || current.expiresAt <= now) return null;
        if (current.consumedAt) {
          await tx.session.update({ where: { id: session.id }, data: { revokedAt: now } });
          return null;
        }

        const user = await tx.user.findFirst({
          where: { id: session.userId, isActive: true, ...emailVerificationEligibility },
          select: { id: true, email: true, role: true, profile: { select: { name: true } } },
        });
        if (!user) return null;

        await tx.refreshToken.update({ where: { tokenHash }, data: { consumedAt: now } });
        await tx.refreshToken.create({
          data: { tokenHash: replacementHash, sessionId: session.id, expiresAt: session.expiresAt },
        });
        return { user, expiresAt: session.expiresAt };
      }, { isolationLevel: "ReadCommitted" }),
  };
}
