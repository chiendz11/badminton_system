import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { ROLES, type Actor } from "@badminton/auth-contracts";
import type { Request } from "express";
export type AuthRequest = Request & { actor: Actor; requestId: string };
export function verifyActor(token: string): Actor {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER || "badminton-identity",
      audience: process.env.JWT_AUDIENCE || "badminton-system",
    });
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.sub.length > 128 ||
      !ROLES.includes(payload.role) ||
      (payload.loyaltyPoints !== undefined &&
        (!Number.isSafeInteger(payload.loyaltyPoints) ||
          payload.loyaltyPoints < 0))
    )
      throw new UnauthorizedException("Danh tính không hợp lệ");
    return {
      userId: payload.sub,
      role: payload.role,
      loyaltyPoints: payload.loyaltyPoints ?? 0,
      name:
        typeof payload.name === "string"
          ? payload.name.slice(0, 150)
          : payload.sub,
    };
  } catch {
    throw new UnauthorizedException("Danh tính không hợp lệ");
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) throw new Error("missing");
      req.actor = verifyActor(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException("Vui lòng đăng nhập bằng token hợp lệ");
    }
  }
}
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
