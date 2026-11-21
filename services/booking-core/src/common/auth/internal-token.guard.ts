import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function extractInternalToken(req: Request): string | undefined {
  const headerToken = req.header("x-internal-token")?.trim();
  if (headerToken) return headerToken;
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_SERVICE_TOKEN?.trim();
    if (!expected) {
      throw new UnauthorizedException("Internal service token chưa được cấu hình");
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = extractInternalToken(req);
    if (!provided) {
      throw new UnauthorizedException("Thiếu token xác thực nội bộ");
    }
    if (!timingSafeEqual(sha256(provided), sha256(expected))) {
      throw new UnauthorizedException("Token xác thực nội bộ không hợp lệ");
    }
    return true;
  }
}
