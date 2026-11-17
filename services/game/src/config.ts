// Runtime configuration for the game service. Refuses to boot without its secret.

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

function requireOrigin(name: string): string {
  const raw = process.env[name] || "";
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(`[config] ${name} must be a bare origin like https://localhost:8443`);
  }
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 3001),
  publicOrigin: requireOrigin("PUBLIC_ORIGIN"),
  internalServiceToken: requireSecret("INTERNAL_SERVICE_TOKEN"),
  usersApiUrl: process.env.USERS_API_URL || "http://users:4000",
  ws: {
    path: "/ws",
    maxPayloadBytes: 4 * 1024,
    // Inputs arrive at most once per frame; anything far above that is abuse.
    maxMessagesPerSecond: 120,
  },
});
