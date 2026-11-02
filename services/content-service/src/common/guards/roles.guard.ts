
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    SetMetadata,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import type { Role } from '@badminton/auth-contracts';
import { AuthRequest } from '../auth/auth.types';

const ROLES_KEY = 'allowed_roles';

export const Roles = (...roles: Role[]) =>
    SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const allowedRoles =
            this.reflector.getAllAndOverride<Role[]>(
                ROLES_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (!allowedRoles?.length) {
            return true;
        }

        const request =
            context.switchToHttp().getRequest<AuthRequest>();

        if (
            !request.actor ||
            !allowedRoles.includes(request.actor.role)
        ) {
            throw new ForbiddenException(
                'Bạn không có quyền thực hiện thao tác này',
            );
        }

        return true;
    }
}
