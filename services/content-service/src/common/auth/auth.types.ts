
import type { Request } from 'express';
import type { Actor } from '@badminton/auth-contracts';

export interface AuthRequest extends Request {
    actor?: Actor;
}
