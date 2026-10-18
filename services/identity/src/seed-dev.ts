import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../generated/client";

async function main() {
  if (process.env.NODE_ENV === "production") throw Error("Development seed disabled in production");
  const password = process.env.IDENTITY_SEED_PASSWORD || "";
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72)
    throw Error("Set IDENTITY_SEED_PASSWORD to 12+ characters, at most 72 UTF-8 bytes");
  const prisma = new PrismaClient();
  try {
    // Never reset an existing account's password or elevate its role.
    const email = "dung@example.com";
    if (await prisma.user.findUnique({ where: { email } })) {
      console.log("Demo account already exists; unchanged"); return;
    }
    await prisma.user.create({ data: { email, passwordHash: await hash(password, 12),
      role: "user", profile: { create: { name: "Bach Dung" } } } });
    console.log("Created development user: dung@example.com");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Seed failed: check database and IDENTITY_SEED_PASSWORD (12+ characters). Production is blocked."); process.exitCode = 1; });
