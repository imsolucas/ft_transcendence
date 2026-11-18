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

function parseOrigin(name: string, raw: string): string {
  try {
    const url = new URL(raw);
    if (url.origin !== raw.replace(/\/+$/, "")) throw new Error();
    return url.origin;
  } catch {
    throw new Error(`[config] ${name} "${raw}" is not a bare origin like https://localhost:8443`);
  }
}

const publicOrigin = parseOrigin("PUBLIC_ORIGIN", requireValue("PUBLIC_ORIGIN"));
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
// Outgoing email (verification, password reset, GDPR confirmations). Optional: without
// SMTP_HOST, emails are logged and skipped. Locally `make env` points it at Mailpit.
const smtpHost = process.env.SMTP_HOST || "";

export const config = Object.freeze({
  port: Number(process.env.PORT || 4000),
  // The one browser origin (Caddy). Better Auth's baseURL and every Origin check use it.
  publicOrigin,
  authSecret: requireSecret("BETTER_AUTH_SECRET"),
  internalServiceToken: requireSecret("INTERNAL_SERVICE_TOKEN"),
  databaseUrl: requireValue("DATABASE_URL"),
  google:
    googleClientId && googleClientSecret ? { clientId: googleClientId, clientSecret: googleClientSecret } : null,
  // Game service (Socket.IO hub) for pushing realtime events
  gameInternalUrl: process.env.GAME_INTERNAL_URL || "http://game:3001",
  smtp: smtpHost
    ? {
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        // implicit TLS on 465; STARTTLS is negotiated otherwise
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        from: process.env.SMTP_FROM || "ft_transcendence <no-reply@localhost>",
      }
    : null,
  // Avatar uploads live here (a Docker volume in compose)
  uploadDir: process.env.UPLOAD_DIR || "/usr/src/app/uploads",
});
