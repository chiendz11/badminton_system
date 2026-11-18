import { hash } from "bcryptjs";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  issueVerificationToken,
  normalizeEmailAddress,
  type SendVerificationEmail,
} from "./email-verification";

export interface PendingRegistration {
  email: string;
  name: string;
  passwordHash: string;
  tokenHash: string;
  expiresAt: Date;
}

type Register = (registration: PendingRegistration) => Promise<{ id: string } | null>;

export function registrationRouter(register: Register, sendVerificationEmail?: SendVerificationEmail) {
  const router = Router();

  router.post("/register", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Quá nhiều lần đăng ký. Thử lại sau." },
  }), async (req, res) => {
    const { email, username, password } = req.body || {};
    const normalizedEmail = normalizeEmailAddress(email);
    const name = typeof username === "string" ? username.trim() : "";
    if (
      !normalizedEmail ||
      name.length < 3 || name.length > 80 ||
      typeof password !== "string" || [...password].length < 12 ||
      Buffer.byteLength(password, "utf8") > 72 || /\s/.test(password) ||
      !/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password) ||
      !/[0-9]/.test(password) || !/[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(password)
    ) {
      res.status(400).json({ message: "Thông tin đăng ký không hợp lệ" });
      return;
    }

    const passwordHash = await hash(password, 12);
    const { token, tokenHash, expiresAt } = issueVerificationToken();
    const account = await register({
      email: normalizedEmail,
      name,
      passwordHash,
      tokenHash,
      expiresAt,
    });
    if (!account) {
      res.status(409).json({ message: "Email đã được đăng ký" });
      return;
    }

    const verificationEmailSent = sendVerificationEmail
      ? await sendVerificationEmail(normalizedEmail, token)
      : false;
    res.status(201).json({
      userId: account.id,
      role: "user",
      isVerified: false,
      verificationEmailSent,
    });
  });

  return router;
}
