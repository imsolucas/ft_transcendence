// Typed runtime configuration. Read once at startup; the process refuses to boot when a
// required secret is missing or too short (see .claude/rules/security-hardening.md §1).

const MIN_SECRET_BYTES = 32;

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || Buffer.byteLength(value, "utf8") < MIN_SECRET_BYTES) {
    throw new Error(
      `[config] ${name} is missing or shorter than ${MIN_SECRET_BYTES} bytes. ` +
        `Generate one with: openssl rand -base64 48`
    );
  }
  return value;
}

function requireValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[config] ${name} is required`);
  return value;
}

function parseOrigins(raw: string): string[] {
  const origins = raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (origins.length === 0) throw new Error("[config] ALLOWED_ORIGINS must list at least one origin");
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin) throw new Error();
    } catch {
      throw new Error(`[config] ALLOWED_ORIGINS entry "${origin}" is not a bare origin like https://localhost:8443`);
    }
  }
  return origins;
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 4000),
  jwtSecret: requireSecret("JWT_SECRET"),
  cookieSecret: requireSecret("COOKIE_SECRET"),
  internalServiceToken: requireSecret("INTERNAL_SERVICE_TOKEN"),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  databaseUrl: requireValue("DATABASE_URL"),
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS || ""),
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
  challengeTtlSeconds: 5 * 60,
  bcryptCost: 12,
});
