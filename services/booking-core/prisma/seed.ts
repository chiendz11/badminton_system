import "dotenv/config";
import { PrismaClient } from "../generated/client";
const prisma = new PrismaClient();
export const CENTER_ID = "11111111-1111-4111-8111-111111111111";
async function seed() {
  await prisma.center.upsert({
    where: { id: CENTER_ID },
    update: {},
    create: {
      id: CENTER_ID,
      name: "Cầu Lông Xanh — Cầu Giấy",
      address: "18 Duy Tân, Cầu Giấy, Hà Nội",
      phone: "0901234567",
      managerId: "demo-manager",
      description:
        "Sân thảm trong nhà, thoáng mát. Chọn sân và khung giờ phù hợp để bắt đầu buổi chơi.",
      facilities: ["Bãi đỗ xe", "Phòng thay đồ", "Nước uống", "Sân thảm"],
      pricing: {
        create: [
          {
            dayType: "WEEKDAY",
            startMinute: 300,
            endMinute: 1020,
            pricePerHour: 80000,
          },
          {
            dayType: "WEEKDAY",
            startMinute: 1020,
            endMinute: 1440,
            pricePerHour: 120000,
          },
          {
            dayType: "WEEKEND",
            startMinute: 300,
            endMinute: 1440,
            pricePerHour: 130000,
          },
        ],
      },
      courts: {
        create: [1, 2, 3, 4].map((n) => ({
          id: `22222222-2222-4222-8222-22222222222${n}`,
          name: `Sân ${n}`,
          surface: "thảm",
        })),
      },
    },
  });
  process.stdout.write("Demo center seeded (existing data unchanged).\n");
}
void seed().finally(() => prisma.$disconnect());
