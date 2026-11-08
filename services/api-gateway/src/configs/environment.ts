
export interface GatewayConfig {
  coreUrl: string;
  identityUrl?: string;
  aiUrl?: string;
  aiTimeout?: number;
  contentUrl?: string;
  contentTimeout?: number;
  jwtSecret: string;
  issuer: string;
  audience: string;
  origins: string[];
  metricsToken: string;
  timeout: number;
}

function validateHttpOrigin(
  value: string,
  name: string,
): string {
  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw Error(`${name} must be an HTTP origin`);
  }

  return url.origin;
}

export function configuration(): GatewayConfig {
  const coreUrl = validateHttpOrigin(
    process.env.BOOKING_CORE_URL || "http://localhost:3000",
    "BOOKING_CORE_URL",
  );

  const identityUrl = validateHttpOrigin(
    process.env.IDENTITY_SERVICE_URL || "http://localhost:8084",
    "IDENTITY_SERVICE_URL",
  );

  const aiUrl = validateHttpOrigin(
    process.env.AI_SERVICE_URL || "http://localhost:8000",
    "AI_SERVICE_URL",
  );

  const contentUrl = validateHttpOrigin(
    process.env.CONTENT_SERVICE_URL || "http://localhost:3001",
    "CONTENT_SERVICE_URL",
  );

  const aiTimeout = Number(
    process.env.AI_UPSTREAM_TIMEOUT_MS || 45000,
  );
  if (
    !Number.isInteger(aiTimeout) ||
    aiTimeout < 100 ||
    aiTimeout > 60000
  ) {
    throw Error("Invalid AI timeout");
  }

  const contentTimeout = Number(
    process.env.CONTENT_UPSTREAM_TIMEOUT_MS || 5000,
  );

  if (
    !Number.isInteger(contentTimeout) ||
    contentTimeout < 100 ||
    contentTimeout > 30000
  ) {
    throw Error("Invalid Content timeout");
  }

  const jwtSecret = process.env.JWT_SECRET || "";

  if (jwtSecret.length < 32) {
    throw Error("JWT_SECRET must have at least 32 characters");
  }

  const metricsToken = process.env.METRICS_TOKEN || "";

  if (
    process.env.NODE_ENV === "production" &&
    (!metricsToken ||
      /local-development|change-me/.test(jwtSecret))
  ) {
    throw Error(
      "Production needs private JWT_SECRET and METRICS_TOKEN",
    );
  }

  const timeout = Number(
    process.env.UPSTREAM_TIMEOUT_MS || 5000,
  );

  if (
    !Number.isInteger(timeout) ||
    timeout < 100 ||
    timeout > 30000
  ) {
    throw Error("Invalid upstream timeout");
  }

  return {
    coreUrl,
    identityUrl,
    aiUrl,
    aiTimeout,
    contentUrl,
    contentTimeout,
    jwtSecret,
    metricsToken,
    timeout,
    issuer: process.env.JWT_ISSUER || "badminton-identity",
    audience: process.env.JWT_AUDIENCE || "badminton-system",
    origins: (process.env.CORS_ORIGINS || "")
      .split(",")
      .filter(Boolean),
  };
}
