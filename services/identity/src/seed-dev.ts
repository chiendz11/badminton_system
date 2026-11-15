import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../generated/client";

const DEFAULT_ACCOUNTS = [
  {
    email: "customer@badminton.local",
    role: "user" as const,
    name: "Khách Hàng Mẫu",
  },
  {
    email: "admin@badminton.local",
    role: "super_admin" as const,
    name: "Quản Trị Viên Hệ Thống",
  },
  {
    email: "manager@badminton.local",
    role: "center_manager" as const,
    name: "Chủ Sân Cầu Giấy",
  },
  {
    email: "dung@example.com",
    role: "user" as const,
    name: "Bach Dung",
  },
];

async function main() {
  if (process.env.NODE_ENV === "production")
    throw Error("Development seed disabled in production");

  const defaultPassword = process.env.IDENTITY_SEED_PASSWORD || "Password123!";
  if (defaultPassword.length < 12 || Buffer.byteLength(defaultPassword, "utf8") > 72)
    throw Error(
      "Set IDENTITY_SEED_PASSWORD to 12+ characters, at most 72 UTF-8 bytes",
    );

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hash(defaultPassword, 12);

    // If explicit custom account is requested via environment
    if (process.env.IDENTITY_SEED_EMAIL) {
      const email = process.env.IDENTITY_SEED_EMAIL.trim().toLowerCase();
      const role = (process.env.IDENTITY_SEED_ROLE || "user") as "user" | "center_manager" | "super_admin";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
        throw Error("Invalid seed email");
      if (role !== "user" && role !== "center_manager" && role !== "super_admin")
        throw Error("Invalid seed role");

      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email,
            passwordHash,
            role,
            profile: {
              create: {
                name: role === "user" ? "Khách Hàng Thử Nghiệm" : "Quản Trị Thử Nghiệm",
              },
            },
          },
        });
        console.log(`Created custom account: ${email} (${role})`);
      }
    }

    // Always seed standard demo accounts if they don't exist
    for (const acc of DEFAULT_ACCOUNTS) {
      const existing = await prisma.user.findUnique({ where: { email: acc.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email: acc.email,
            passwordHash,
            role: acc.role,
            profile: {
              create: {
                name: acc.name,
              },
            },
          },
        });
        console.log(`Created demo account: ${acc.email} (${acc.role})`);
      } else {
        console.log(`Account ${acc.email} already exists; unchanged`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
