import type { Actor } from "@badminton/auth-contracts";
declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      requestId: string;
    }
  }
}
export {};
