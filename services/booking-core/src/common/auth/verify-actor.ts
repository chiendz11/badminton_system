import { ROLES, type Actor } from "@badminton/auth-contracts";
import { UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
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
