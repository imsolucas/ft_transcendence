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
    throw new Error(`[config] ${name} "${raw}" is not a bare origin like https://localhost:47443`);
  }
}

const publicOrigin = parseOrigin("PUBLIC_ORIGIN", requireValue("PUBLIC_ORIGIN"));

// A real deployment (a public domain) must not run with development shortcuts. Local: localhost,
// *.localhost, loopback and private LAN addresses (testing from a phone on the same Wi-Fi).
function isLocalHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host === "[::1]") return true;
  const ip = host.split(".").map(Number);
  if (ip.length !== 4 || ip.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = ip as [number, number, number, number];
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}
const isLocalOrigin = isLocalHost(new URL(publicOrigin).hostname);
// Sign-in waits for a verified email (default). REQUIRE_EMAIL_VERIFICATION=false runs without
// email at all (no provider yet): a new account can log in right away, but password reset and
// sign-in alerts can't be sent, and nobody proves they own their address.
const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
if (!isLocalOrigin) {
  if (process.env.SEED_DEV_DATA === "true") {
    throw new Error("[config] SEED_DEV_DATA=true on a public origin: the dev accounts have well-known passwords. Set it to false.");
  }
  const smtp = process.env.SMTP_HOST || "";
  if (requireEmailVerification && (!smtp || smtp === "mailpit")) {
    throw new Error(
      "[config] a public origin needs a real SMTP_HOST: sign-in waits for email verification, so without email nobody could sign up. " +
        "No email provider yet? Set REQUIRE_EMAIL_VERIFICATION=false (see docs/DEPLOY.md).",
    );
  }
}
// Outgoing email (verification, password reset, GDPR confirmations). Required on a public
// origin (sign-in waits for a verified email); locally `make env` points it at Mailpit, and
// without SMTP_HOST emails are logged and skipped.
const smtpHost = process.env.SMTP_HOST || "";
// Bot check on sign-up / sign-in / password reset (Cloudflare Turnstile). Optional: both keys
// or neither. Without them there is no captcha (and nothing is sent to Cloudflare).
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || "";
const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
if (!!turnstileSecret !== !!turnstileSiteKey) throw new Error("[config] set both TURNSTILE_SECRET_KEY and TURNSTILE_SITE_KEY, or neither");
// Coach: a remote OpenAI-compatible chat API. Optional: without AI_BASE_URL it is off.
const aiBaseUrl = process.env.AI_BASE_URL || "";

function parseHttpUrl(name: string, raw: string): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.href.replace(/\/+$/, "");
  } catch {
    // the value itself is not echoed (it could carry credentials)
    throw new Error(`[config] ${name} must be an http(s) URL like https://openrouter.ai/api/v1`);
  }
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 4000),
  // The one browser origin (Caddy). Better Auth's baseURL and every Origin check use it.
  publicOrigin,
  authSecret: requireSecret("BETTER_AUTH_SECRET"),
  internalServiceToken: requireSecret("INTERNAL_SERVICE_TOKEN"),
  databaseUrl: requireValue("DATABASE_URL"),
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
        from: process.env.SMTP_FROM || "VOLLEY.EXE <no-reply@localhost>",
      }
    : null,
  requireEmailVerification,
  turnstile: turnstileSecret ? { secretKey: turnstileSecret, siteKey: turnstileSiteKey } : null,
  // remote OpenAI-compatible chat API for the Coach (OpenRouter, Groq, Gemini, Ollama cloud, …)
  ai: aiBaseUrl
    ? { baseUrl: parseHttpUrl("AI_BASE_URL", aiBaseUrl), model: requireValue("AI_MODEL"), apiKey: process.env.AI_API_KEY || null }
    : null,
  // Avatar uploads live here (a Docker volume in compose)
  uploadDir: process.env.UPLOAD_DIR || "/usr/src/app/uploads",
});
