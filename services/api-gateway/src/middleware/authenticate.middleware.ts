import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { ROLES } from "@badminton/auth-contracts";
import type { GatewayConfig } from "../configs/environment";
import { GatewayError } from "./http-errors";
export function authenticate(config: GatewayConfig): RequestHandler {
  return (req, _res, next) => {
    try {
      if (!req.headers.authorization) return next();
      if (!req.headers.authorization.startsWith("Bearer "))
        throw Error("Invalid bearer");
      const payload = jwt.verify(
        req.headers.authorization.slice(7),
        config.jwtSecret,
        {
          algorithms: ["HS256"],
          issuer: config.issuer,
          audience: config.audience,
        },
      );
      if (
        typeof payload === "string" ||
        typeof payload.sub !== "string" ||
        !payload.sub ||
        payload.sub.length > 128 ||
        !ROLES.includes(payload.role) ||
        !Number.isSafeInteger(payload.exp) ||
        typeof payload.exp !== "number" ||
        payload.exp <= Date.now() / 1000 ||
        (payload.loyaltyPoints !== undefined &&
          (!Number.isSafeInteger(payload.loyaltyPoints) ||
            payload.loyaltyPoints < 0))
      )
        throw Error("Invalid actor");
      req.actor = {
        userId: payload.sub,
        role: payload.role,
        name:
          typeof payload.name === "string"
            ? payload.name.slice(0, 150)
            : payload.sub,
        loyaltyPoints: payload.loyaltyPoints || 0,
      };
      next();
    } catch {
      next(new GatewayError(401, "Danh tính không hợp lệ"));
    }
  };
}
