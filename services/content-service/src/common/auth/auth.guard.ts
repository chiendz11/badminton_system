
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { AuthRequest } from './auth.types';
import { verifyActor } from './verify-actor';

@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request =
            context.switchToHttp().getRequest<AuthRequest>();

        const header = request.headers.authorization;

        if (!header?.startsWith('Bearer ')) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập bằng token hợp lệ',
            );
        }

        request.actor = verifyActor(header.slice(7));

        return true;
    }
}
