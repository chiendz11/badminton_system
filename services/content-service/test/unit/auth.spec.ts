import { describe, it, expect, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { verifyActor } from "../../src/common/auth/verify-actor";

describe("verifyActor", () => {
  const secret = "test-secret-at-least-32-characters-long";
  const issuer = "badminton-identity";
  const audience = "badminton-system";

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    process.env.JWT_ISSUER = issuer;
    process.env.JWT_AUDIENCE = audience;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
  });

  it("successfully verifies and extracts a valid user actor", () => {
    const token = jwt.sign(
      {
        sub: "user-123",
        role: "user",
        name: "Test User",
        loyaltyPoints: 100,
      },
      secret,
      { algorithm: "HS256", issuer, audience, expiresIn: "1h" },
    );

    const actor = verifyActor(token);
    expect(actor.userId).toBe("user-123");
    expect(actor.role).toBe("user");
    expect(actor.name).toBe("Test User");
    expect(actor.loyaltyPoints).toBe(100);
  });

  it("throws UnauthorizedException for invalid token or secret mismatch", () => {
    const token = jwt.sign({ sub: "user-123", role: "user" }, "wrong-secret", {
      algorithm: "HS256",
      issuer,
      audience,
    });

    expect(() => verifyActor(token)).toThrow();
  });

  it("throws UnauthorizedException when required actor fields are missing", () => {
    const token = jwt.sign({ sub: "user-123" }, secret, {
      algorithm: "HS256",
      issuer,
      audience,
    });

    expect(() => verifyActor(token)).toThrow();
  });
});
