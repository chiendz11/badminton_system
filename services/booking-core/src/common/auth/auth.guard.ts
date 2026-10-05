import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthRequest } from "./auth.types";
import { verifyActor } from "./verify-actor";
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
