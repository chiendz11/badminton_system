import type { RequestHandler } from "express";
import type { Role } from "@badminton/auth-contracts";
import { GatewayError } from "./http-errors";
export function authorize(allowedRoles: readonly Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.actor) return next(new GatewayError(401, "Cần bearer token"));
    if (!allowedRoles.includes(req.actor.role))
      return next(new GatewayError(403, "Không có quyền"));
    next();
  };
}
