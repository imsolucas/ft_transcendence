// Runtime configuration for the game service. Refuses to boot without its secrets.

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

function parseOrigins(raw: string): string[] {
  const origins = raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (origins.length === 0) throw new Error("[config] ALLOWED_ORIGINS must list at least one origin");
  return origins;
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 3001),
  // Same secret as the users service: the game verifies access tokens it did not issue.
  jwtSecret: requireSecret("JWT_SECRET"),
  internalServiceToken: requireSecret("INTERNAL_SERVICE_TOKEN"),
  usersApiUrl: process.env.USERS_API_URL || "http://users:4000",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS || ""),
  ws: {
    maxPayloadBytes: 4 * 1024,
    // Inputs arrive at most once per frame; anything far above that is abuse.
    maxMessagesPerSecond: 120,
  },
});
