import type { Prisma, PrismaClient } from "../generated/client";
import { issueVerificationToken, verificationLifetimeMs } from "./email-verification";

const resendCooldownMs = 60_000;

async function lockPendingUser(tx: Prisma.TransactionClient, userId: string) {
  // Verification and resend lock the user before modifying tokens.
  const [user] = await tx.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "User"
    WHERE id = ${userId}::uuid AND "isActive" AND NOT "isVerified"
    FOR UPDATE
  `;
  return Boolean(user);
}

export function createEmailVerificationStore(prisma: PrismaClient) {
  return {
    verify: (tokenHash: string) => prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: { userId: true },
      });
      if (!token || !(await lockPendingUser(tx, token.userId))) return false;

      const now = new Date();
      const claimed = await tx.emailVerificationToken.updateMany({
        where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (claimed.count !== 1) return false;

      await tx.user.update({
        where: { id: token.userId },
        data: { isVerified: true },
      });
      return true;
    }),

    reissue: (email: string) => prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (!user || !(await lockPendingUser(tx, user.id))) return null;

      const previous = await tx.emailVerificationToken.findFirst({
        where: { userId: user.id },
        orderBy: { expiresAt: "desc" },
        select: { expiresAt: true },
      });
      // Token history identifies accounts created through registration.
      if (!previous) return null;

      const now = new Date();
      const issuedAt = previous.expiresAt.getTime() - verificationLifetimeMs;
      if (now.getTime() - issuedAt < resendCooldownMs) return null;

      const { token, ...replacement } = issueVerificationToken(now);
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.emailVerificationToken.create({
        data: { userId: user.id, ...replacement },
      });
      return token;
    }),
  };
}
