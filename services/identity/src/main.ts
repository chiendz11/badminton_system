import "dotenv/config";
import { PrismaClient } from "../generated/client";
import { configuration } from "./config/environment";
import { authRouter } from "./auth";
import { createApp } from "./app";

const config = configuration();
const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});
const app = createApp(async () => {
  await prisma.$queryRaw`SELECT 1`;
}, authRouter({
  byEmail: (email) => prisma.user.findUnique({ where: { email }, include: { profile: true } }),
  byId: (id) => prisma.user.findUnique({ where: { id }, include: { profile: true } }),
}, config));
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
