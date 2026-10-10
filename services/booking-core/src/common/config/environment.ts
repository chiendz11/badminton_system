export function validateEnvironment() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const ttl = Number(process.env.RESERVATION_TTL_SECONDS || 300);
  if (!Number.isInteger(ttl) || ttl < 30 || ttl > 900)
    throw new Error("Reservation TTL must be 30–900 seconds");
  if (process.env.NODE_ENV === "production") {
    if (process.env.ENABLE_DEMO_AUTH === "true")
      throw new Error("Demo sessions must be disabled in production");
    if (!process.env.METRICS_TOKEN)
      throw new Error("Production metrics require METRICS_TOKEN");
    if (
      process.env.JWT_SECRET === "local-development-only-change-me-32-chars" ||
      process.env.METRICS_TOKEN === "local-monitoring-only"
    )
      throw new Error("Replace the local example secrets before production");
  }
}
