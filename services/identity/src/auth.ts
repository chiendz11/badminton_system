import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Router, type CookieOptions, type Response } from "express";
import jwt from "jsonwebtoken";
import { compare, hash } from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import type { IdentityConfig } from "./config/environment";
import { requireUser } from "./access";

export interface AuthUser {
  id: string; email: string; passwordHash: string | null;
  role: "user" | "center_manager" | "super_admin";
  isActive: boolean; profile: { name: string } | null;
}
type SessionUser = Pick<AuthUser, "id" | "email" | "role" | "profile">;

export interface UserStore {
  byEmail(email: string): Promise<AuthUser | null>;
  byId(id: string): Promise<AuthUser | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<SessionUser | void>;
  rotateSession(tokenHash: string, replacementHash: string): Promise<{ user: SessionUser; expiresAt: Date } | null>;
  revokeSession(tokenHash: string): Promise<void>;
}

const refreshLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const publicUser = (user: SessionUser) => ({
  userId: user.id, email: user.email, role: user.role,
  name: user.profile?.name || user.email,
});
function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const refreshCookieName = "refresh_token";
const expiredSessionMessage = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn";

function readRefreshToken(cookieHeader?: string) {
  const prefix = refreshCookieName + "=";
  const cookies = cookieHeader?.split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(prefix));
  if (cookies?.length !== 1) return null;
  const token = cookies[0].slice(prefix.length);
  return token.length === 43 && !/[^A-Za-z0-9_-]/.test(token) ? token : null;
}

function refreshCookieOptions(config: IdentityConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secureRefreshCookie,
    sameSite: "lax",
    path: "/api/auth",
  };
}

function respondWithSession(
  res: Response,
  config: IdentityConfig,
  user: SessionUser,
  refreshToken: string,
  expiresAt: Date,
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = Math.min(900, Math.floor(expiresAt.getTime() / 1000) - issuedAt);
  if (expiresIn < 1) {
    res.status(401).json({ message: expiredSessionMessage });
    return;
  }
  const profile = publicUser(user);
  const accessToken = jwt.sign({ role: user.role, name: profile.name, iat: issuedAt }, config.jwtSecret, {
    algorithm: "HS256",
    subject: user.id,
    issuer: config.issuer,
    audience: config.audience,
    expiresIn,
    jwtid: randomUUID(),
  });
  res.cookie(refreshCookieName, refreshToken, {
    ...refreshCookieOptions(config),
    expires: expiresAt,
  });
  res.json({ accessToken, tokenType: "Bearer", expiresIn, profile });
}

export function authRouter(store: UserStore, config: IdentityConfig) {
  const router = Router();
  const dummyHash = hash("unused-password-for-timing", 12);
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20,
    standardHeaders: "draft-8", legacyHeaders: false,
    message: { message: "Quá nhiều lần đăng nhập. Thử lại sau." },
  }), async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== "string" || !password.length || Buffer.byteLength(password, "utf8") > 72) {
      res.status(400).json({ message: "Email hoặc mật khẩu không hợp lệ" }); return;
    }
    const user = await store.byEmail(email.trim().toLowerCase());
    const matches = await compare(password, user?.passwordHash || await dummyHash);
    if (!user || !user.isActive || !user.passwordHash || !matches) {
      res.status(401).json({ message: "Email hoặc mật khẩu không đúng" }); return;
    }
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + refreshLifetimeMs);
    const sessionUser = await store.createSession(user.id, hashRefreshToken(refreshToken), expiresAt);
    respondWithSession(res, config, sessionUser ?? user, refreshToken, expiresAt);
  });

  router.post("/refresh", async (req, res) => {
    const token = readRefreshToken(req.get("cookie"));
    if (token) {
      const replacement = randomBytes(32).toString("base64url");
      const rotated = await store.rotateSession(hashRefreshToken(token), hashRefreshToken(replacement));
      if (rotated) {
        respondWithSession(res, config, rotated.user, replacement, rotated.expiresAt);
        return;
      }
    }
    res.status(401).json({ message: expiredSessionMessage });
  });

  router.post("/logout", async (req, res) => {
    const token = readRefreshToken(req.get("cookie"));
    if (token) await store.revokeSession(hashRefreshToken(token));

    res.clearCookie(refreshCookieName, refreshCookieOptions(config));
    res.status(204).end();
  });

  router.get("/me", requireUser(config, store.byId), (_req, res) => {
    res.json({ profile: publicUser(res.locals.actor) });
  });
  return router;
}
