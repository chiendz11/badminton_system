import type { Actor } from "@badminton/auth-contracts";
import type { Request } from "express";
export type AuthRequest = Request & { actor: Actor; requestId: string };
