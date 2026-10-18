import { Router } from "express";
import jwt from "jsonwebtoken";
import { compare, hash } from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import type { IdentityConfig } from "./config/environment";

export interface AuthUser {
  id: string; email: string; passwordHash: string | null;
  role: "user" | "center_manager" | "super_admin";
  isActive: boolean; profile: { name: string } | null;
}
export interface UserStore {
  byEmail(email: string): Promise<AuthUser | null>;
  byId(id: string): Promise<AuthUser | null>;
}
const roles = ["user", "center_manager", "super_admin"];
const publicUser = (user: AuthUser) => ({
  userId: user.id, email: user.email, role: user.role,
  name: user.profile?.name || user.email,
});
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
    const profile = publicUser(user);
    const accessToken = jwt.sign({ role: user.role, name: profile.name }, config.jwtSecret, {
      algorithm: "HS256", subject: user.id, issuer: config.issuer,
      audience: config.audience, expiresIn: "15m",
    });
    res.json({ accessToken, tokenType: "Bearer", expiresIn: 900, profile });
  });
  router.get("/me", async (req, res) => {
    const authorization = req.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Cần đăng nhập" }); return;
    }
    let userId: string;
    try {
      const payload = jwt.verify(authorization.slice(7), config.jwtSecret, {
        algorithms: ["HS256"], issuer: config.issuer, audience: config.audience,
      });
      if (typeof payload === "string" || typeof payload.sub !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub) ||
          !Number.isSafeInteger(payload.exp) || !roles.includes(payload.role)) throw Error("Invalid claims");
      userId = payload.sub;
    } catch {
      res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" }); return;
    }
    const user = await store.byId(userId);
    if (!user?.isActive) { res.status(401).json({ message: "Cần đăng nhập" }); return; }
    res.json({ profile: publicUser(user) });
  });
  return router;
}
