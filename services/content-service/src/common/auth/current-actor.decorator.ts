
import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';

import type { Actor } from '@badminton/auth-contracts';
import { AuthRequest } from './auth.types';

export const CurrentActor = createParamDecorator(
    (_data: unknown, context: ExecutionContext): Actor => {
        const request =
            context.switchToHttp().getRequest<AuthRequest>();

        if (!request.actor) {
            throw new UnauthorizedException(
                'Không tìm thấy danh tính người dùng',
            );
        }

        return request.actor;
    },
);
