import "dotenv/config";
import { Prisma, PrismaClient } from "../generated/client";
import { configuration } from "./config/environment";
import { authRouter } from "./auth";
import { registrationRouter } from "./registration";
import { emailVerificationRouter } from "./email-verification";
import { createEmailVerificationStore } from "./email-verification-store";
import { createApp } from "./app";
import { mailpitSender } from "./mailpit";
import { createSessionStore, emailVerificationEligibility } from "./session-store";

const config = configuration();
const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});
const verification = createEmailVerificationStore(prisma);
const sessions = createSessionStore(prisma);
const sendVerificationEmail = config.mailpit && mailpitSender(config.mailpit);
const app = createApp(async () => {
  await prisma.$queryRaw`SELECT 1`;
}, authRouter({
  byEmail: (email) => prisma.user.findUnique({
    where: {
      email,
      ...emailVerificationEligibility,
    },
    include: { profile: true },
  }),
  byId: (id) => prisma.user.findUnique({ where: { id }, include: { profile: true } }),
  ...sessions,
}, config).use(registrationRouter(async ({ email, name, passwordHash, tokenHash, expiresAt }) => {
  try {
    // Prisma runs this nested write in one transaction.
    return await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "user",
        isVerified: false,
        profile: { create: { name } },
        verificationTokens: { create: { tokenHash, expiresAt } },
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("email")
    ) return null;
    throw error;
  }
}, sendVerificationEmail)).use(emailVerificationRouter(
  verification.verify,
  sendVerificationEmail && { reissue: verification.reissue, send: sendVerificationEmail },
)));
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "identity_started", port: config.port }));
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => process.exit(1), 10000);
  timer.unref();
  server.close(() => {
    void prisma.$disconnect().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
