import crypto from "node:crypto";
import { config } from "../config.js";

export interface AuthenticatedUser {
  id: number;
  username: string;
  exp: number;
}

const ACCESS_COOKIE = "access_token";

function base64UrlDecode(part: string): Buffer {
  return Buffer.from(part, "base64url");
}

/**
 * Verifies an HS256 JWT issued by the users service. Rejects any other algorithm,
 * a bad signature, an expired token, or a challenge token (which carries `purpose`).
 * Note: the users-service blacklist is not consulted here; a logged-out access token
 * stays usable for a WS upgrade until it expires (≤ 15 min).
 */
export function verifyAccessToken(token: string): AuthenticatedUser | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let header: { alg?: unknown; typ?: unknown };
  let payload: { sub?: unknown; username?: unknown; exp?: unknown; nbf?: unknown; purpose?: unknown };
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;

  const expected = crypto.createHmac("sha256", config.jwtSecret).update(`${headerB64}.${payloadB64}`).digest();
  const actual = base64UrlDecode(signatureB64);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  if (typeof payload.nbf === "number" && payload.nbf > now) return null;
  if (payload.purpose !== undefined) return null;

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) return null;
  const username = typeof payload.username === "string" ? payload.username : "";
  if (!username) return null;

  return { id, username, exp: payload.exp };
}

/** Minimal Cookie header parser (the game service doesn't need @fastify/cookie). */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function readAccessCookie(cookieHeader: string | undefined): string | undefined {
  return readCookie(cookieHeader, ACCESS_COOKIE);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return !!origin && config.allowedOrigins.includes(origin.replace(/\/+$/, ""));
}
