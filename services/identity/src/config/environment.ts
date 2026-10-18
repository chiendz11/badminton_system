export interface IdentityConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  issuer: string;
  audience: string;
}
export function configuration(
  env: NodeJS.ProcessEnv = process.env,
): IdentityConfig {
  const port = Number(env.PORT || 8084);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid PORT");
  const databaseUrl = env.DATABASE_URL || "";
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw Error("DATABASE_URL is required");
  }
  if (!["postgresql:", "postgres:"].includes(url.protocol))
    throw Error("DATABASE_URL must use PostgreSQL");
  const jwtSecret = env.JWT_SECRET || "";
  if (jwtSecret.length < 32)
    throw Error("JWT_SECRET must have at least 32 characters");
  if (
    env.NODE_ENV === "production" &&
    /local-development|change-me/.test(jwtSecret)
  )
    throw Error("Production needs a private JWT_SECRET");
  return {
    port,
    databaseUrl,
    jwtSecret,
    issuer: env.JWT_ISSUER || "badminton-identity",
    audience: env.JWT_AUDIENCE || "badminton-system",
  };
}
