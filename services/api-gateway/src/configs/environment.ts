export interface GatewayConfig {
  coreUrl: string;
  aiUrl?: string;
  aiTimeout?: number;
  jwtSecret: string;
  issuer: string;
  audience: string;
  origins: string[];
  metricsToken: string;
  timeout: number;
}
export function configuration(): GatewayConfig {
  const coreUrl = process.env.BOOKING_CORE_URL || "http://localhost:3000",
    url = new URL(coreUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw Error("BOOKING_CORE_URL must be an HTTP origin without credentials");
  const aiUrl = new URL(process.env.AI_SERVICE_URL || "http://localhost:8000");
  if (
    !["http:", "https:"].includes(aiUrl.protocol) ||
    aiUrl.username ||
    aiUrl.password ||
    aiUrl.pathname !== "/" ||
    aiUrl.search ||
    aiUrl.hash
  )
    throw Error("AI_SERVICE_URL must be an HTTP origin");
  const aiTimeout = Number(process.env.AI_UPSTREAM_TIMEOUT_MS || 45000);
  if (!Number.isInteger(aiTimeout) || aiTimeout < 100 || aiTimeout > 60000)
    throw Error("Invalid AI timeout");
  const jwtSecret = process.env.JWT_SECRET || "";
  if (jwtSecret.length < 32)
    throw Error("JWT_SECRET must have at least 32 characters");
  const metricsToken = process.env.METRICS_TOKEN || "";
  if (
    process.env.NODE_ENV === "production" &&
    (!metricsToken || /local-development|change-me/.test(jwtSecret))
  )
    throw Error("Production needs private JWT_SECRET and METRICS_TOKEN");
  const timeout = Number(process.env.UPSTREAM_TIMEOUT_MS || 5000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30000)
    throw Error("Invalid upstream timeout");
  return {
    coreUrl: url.origin,
    aiUrl: aiUrl.origin,
    aiTimeout,
    jwtSecret,
    metricsToken,
    timeout,
    issuer: process.env.JWT_ISSUER || "badminton-identity",
    audience: process.env.JWT_AUDIENCE || "badminton-system",
    origins: (process.env.CORS_ORIGINS || "").split(",").filter(Boolean),
  };
}
