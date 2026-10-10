import type { Actor } from "@badminton/auth-contracts";
import { NotFoundException } from "@nestjs/common";
import jwt from "jsonwebtoken";
export const DEMO_ACTORS: Record<string, Actor> = {
  customer: { userId: "demo-customer", name: "Khách Demo", role: "user" },
  customer2: { userId: "demo-customer-2", name: "Khách Demo 2", role: "user" },
  manager: {
    userId: "demo-manager",
    name: "Quản lý Demo",
    role: "center_manager",
  },
  admin: { userId: "demo-admin", name: "Admin Demo", role: "super_admin" },
};
export function demoToken(profile: string) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_DEMO_AUTH !== "true"
  )
    throw new NotFoundException();
  const actor = DEMO_ACTORS[profile];
  if (!actor) throw new NotFoundException();
  return {
    actor,
    token: jwt.sign(
      { role: actor.role, name: actor.name },
      process.env.JWT_SECRET!,
      {
        subject: actor.userId,
        issuer: process.env.JWT_ISSUER || "badminton-identity",
        audience: process.env.JWT_AUDIENCE || "badminton-system",
        expiresIn: "1h",
        algorithm: "HS256",
      },
    ),
  };
}
