import type { Actor } from "@badminton/auth-contracts";
import { ForbiddenException } from "@nestjs/common";
export function assertCenterManager(
  actor: Actor,
  center: { managerId: string },
) {
  if (
    actor.role !== "super_admin" &&
    !(actor.role === "center_manager" && center.managerId === actor.userId)
  )
    throw new ForbiddenException("Bạn không quản lý trung tâm này");
}
