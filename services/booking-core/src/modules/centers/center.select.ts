import { Prisma } from "../../../generated/client";
export const CENTER_INCLUDE = {
  courts: { orderBy: { name: "asc" as const } },
  pricing: { orderBy: { startMinute: "asc" as const } },
};
export type FullCenter = Prisma.CenterGetPayload<{
  include: typeof CENTER_INCLUDE;
}>;
