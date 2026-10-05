export interface GatewayConfig {
  coreUrl: string;
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
    jwtSecret,
    metricsToken,
    timeout,
    issuer: process.env.JWT_ISSUER || "badminton-identity",
    audience: process.env.JWT_AUDIENCE || "badminton-system",
    origins: (process.env.CORS_ORIGINS || "").split(",").filter(Boolean),
  };
}
