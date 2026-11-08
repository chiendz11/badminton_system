import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../generated/client";

async function main() {
  if (process.env.NODE_ENV === "production")
    throw Error("Development seed disabled in production");
  const password = process.env.IDENTITY_SEED_PASSWORD || "";
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72)
    throw Error(
      "Set IDENTITY_SEED_PASSWORD to 12+ characters, at most 72 UTF-8 bytes",
    );
  const prisma = new PrismaClient();
  try {
    // Never reset an existing account's password or elevate its role.
    const email = (process.env.IDENTITY_SEED_EMAIL || "dung@example.com")
      .trim()
      .toLowerCase();
    const role = process.env.IDENTITY_SEED_ROLE || "user";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw Error("Invalid seed email");
    if (role !== "user" && role !== "center_manager" && role !== "super_admin")
      throw Error("Invalid seed role");
    if (await prisma.user.findUnique({ where: { email } })) {
      console.log("Demo account already exists; unchanged");
      return;
    }
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hash(password, 12),
        role,
        profile: {
          create: {
            name: role === "user" ? "Bach Dung" : "Quản trị thử nghiệm",
          },
        },
      },
    });
    console.log(`Created development account: ${email} (${role})`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Seed failed: check database and IDENTITY_SEED_PASSWORD (12+ characters). Production is blocked.",
  );
  process.exitCode = 1;
});
