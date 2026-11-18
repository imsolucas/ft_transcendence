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

/**
 * Optional blockchain recording of tournament results (src/chain). Off unless both
 * CHAIN_RPC_URL and CHAIN_PRIVATE_KEY are set; a value that is set but malformed fails fast.
 */
function chainConfig() {
  const rpcUrl = process.env.CHAIN_RPC_URL || "";
  const privateKey = process.env.CHAIN_PRIVATE_KEY || "";
  if (!rpcUrl && !privateKey) return null;
  if (!rpcUrl || !privateKey) throw new Error("[config] set both CHAIN_RPC_URL and CHAIN_PRIVATE_KEY, or neither");
  try {
    const u = new URL(rpcUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("[config] CHAIN_RPC_URL must be an http(s) URL");
  }
  // never echo the key itself
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("[config] CHAIN_PRIVATE_KEY must be 0x followed by 64 hex digits");
  const contractAddress = process.env.CHAIN_CONTRACT_ADDRESS || null;
  if (contractAddress && !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
    throw new Error("[config] CHAIN_CONTRACT_ADDRESS must be a 0x-prefixed 20-byte address");
  }
  const chainIdRaw = process.env.CHAIN_ID || "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : null;
  if (chainId !== null && (!Number.isSafeInteger(chainId) || chainId <= 0)) throw new Error("[config] CHAIN_ID must be a positive integer");
  const explorerRaw = process.env.CHAIN_EXPLORER_URL || "";
  let explorerUrl: string | null = null;
  if (explorerRaw) {
    try {
      const u = new URL(explorerRaw);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      explorerUrl = u.href.replace(/\/+$/, "");
    } catch {
      throw new Error("[config] CHAIN_EXPLORER_URL must be an http(s) URL");
    }
  }
  return { rpcUrl, privateKey, contractAddress, chainId, explorerUrl };
}

const publicOrigin = parseOrigin("PUBLIC_ORIGIN", requireValue("PUBLIC_ORIGIN"));
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

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
  // Avatar uploads live here (a Docker volume in compose)
  uploadDir: process.env.UPLOAD_DIR || "/usr/src/app/uploads",
  // Tournament results on an EVM chain (Avalanche Fuji, or a local anvil); null = off
  chain: chainConfig(),
});
