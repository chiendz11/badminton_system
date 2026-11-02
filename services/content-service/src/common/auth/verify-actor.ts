
import {
    ROLES,
    type Actor,
    type Role,
} from '@badminton/auth-contracts';
import { UnauthorizedException } from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export function verifyActor(token: string): Actor {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET chưa được cấu hình');
    }

    try {
        const payload = jwt.verify(token, secret, {
            algorithms: ['HS256'],
            issuer: process.env.JWT_ISSUER || 'badminton-identity',
            audience: process.env.JWT_AUDIENCE || 'badminton-system',
        });

        if (typeof payload === 'string') {
            throw new UnauthorizedException('Token không hợp lệ');
        }

        const data = payload as JwtPayload & {
            role?: unknown;
            name?: unknown;
            loyaltyPoints?: unknown;
        };

        if (
            typeof data.sub !== 'string' ||
            !data.sub ||
            data.sub.length > 128 ||
            !ROLES.some((role) => role === data.role) ||
            (data.loyaltyPoints !== undefined &&
                (typeof data.loyaltyPoints !== 'number' ||
                    !Number.isSafeInteger(data.loyaltyPoints) ||
                    data.loyaltyPoints < 0))
        ) {
            throw new UnauthorizedException('Danh tính không hợp lệ');
        }

        return {
            userId: data.sub,
            role: data.role as Role,
            name:
                typeof data.name === 'string'
                    ? data.name.slice(0, 150)
                    : data.sub,
            loyaltyPoints: (data.loyaltyPoints as number | undefined) ?? 0,
        };
    } catch {
        throw new UnauthorizedException('Danh tính không hợp lệ');
    }
}
