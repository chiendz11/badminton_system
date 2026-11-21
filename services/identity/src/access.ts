import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { IdentityConfig } from "./config/environment";
import type { AuthUser } from "./auth";

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tokenMatches(
  actual: string | undefined,
  expected: string | undefined,
) {
  if (!expected || !actual) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

export function requireUser(
  config: IdentityConfig,
  byId: (id: string) => Promise<AuthUser | null>,
  adminOnly = false,
): RequestHandler {
  return async (req, res, next) => {
    let userId: string;
    try {
      const header = req.get("authorization");
      if (!header?.startsWith("Bearer ")) throw Error("Missing token");
      const payload = jwt.verify(header.slice(7), config.jwtSecret, {
        algorithms: ["HS256"],
        issuer: config.issuer,
        audience: config.audience,
      });
      if (
        typeof payload === "string" ||
        typeof payload.sub !== "string" ||
        !uuidPattern.test(payload.sub) ||
        !Number.isSafeInteger(payload.exp) ||
        !["user", "center_manager", "super_admin"].includes(payload.role)
      ) {
        throw Error("Invalid claims");
      }
      userId = payload.sub;
    } catch {
      res.status(401).json({ message: "Cần đăng nhập" });
      return;
    }
    // Always authorize using the current database role, including for older JWTs.
    const user = await byId(userId);
    if (!user?.isActive) {
      res.status(401).json({ message: "Cần đăng nhập" });
      return;
    }
    if (adminOnly && user.role !== "super_admin") {
      res
        .status(403)
        .json({
          message: "Chỉ quản trị viên hệ thống được thực hiện thao tác này",
        });
      return;
    }
    res.locals.actor = user;
    next();
  };
}
