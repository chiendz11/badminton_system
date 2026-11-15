import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

type VerifyEmail = (tokenHash: string) => Promise<boolean>;
export type SendVerificationEmail = (email: string, token: string) => Promise<boolean>;
type ResendVerification = {
  reissue: (email: string) => Promise<string | null>;
  send: SendVerificationEmail;
};

export const verificationLifetimeMs = 24 * 60 * 60 * 1000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.toLowerCase();
  if (email.length > 254 || /\s/.test(email) || !emailPattern.test(email)) return null;
  return email;
}

const invalidTokenMessage = "Link xác minh không hợp lệ hoặc đã hết hạn";

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueVerificationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(now.getTime() + verificationLifetimeMs),
  };
}

export function emailVerificationRouter(
  verifyEmail: VerifyEmail,
  resend?: ResendVerification,
) {
  const router = Router();

  router.post("/verify-email", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Quá nhiều lần xác minh. Thử lại sau." },
  }), async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== "string" || token.length !== 43 || /[^A-Za-z0-9_-]/.test(token)) {
      res.status(400).json({ message: invalidTokenMessage });
      return;
    }

    if (!(await verifyEmail(hashVerificationToken(token)))) {
      res.status(400).json({ message: invalidTokenMessage });
      return;
    }

    res.status(204).end();
  });

  router.post("/resend-verification", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Quá nhiều lần gửi lại. Thử lại sau." },
  }), async (req, res) => {
    const email = normalizeEmailAddress(req.body?.email);
    if (!email) {
      res.status(400).json({ message: "Email không hợp lệ" });
      return;
    }

    const token = await resend?.reissue(email);
    res.status(202).json({
      message: "Nếu tài khoản đang chờ xác minh, hãy kiểm tra hộp thư.",
    });

    if (token && resend) {
      const sent = await resend.send(email, token).catch(() => false);
      if (!sent) console.warn(JSON.stringify({ event: "verification_email_delivery_failed" }));
    }
  });

  return router;
}
