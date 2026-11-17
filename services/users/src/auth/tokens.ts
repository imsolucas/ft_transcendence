import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.ts";
import { prisma } from "../db/client.ts";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const TWOFA_CHALLENGE_COOKIE = "twofa_challenge";
export const SETPW_CHALLENGE_COOKIE = "setpw_challenge";

const ACCESS_COOKIE_PATH = "/";
// Refresh and challenge cookies are only ever needed by /auth/* routes
const AUTH_COOKIE_PATH = "/auth";

const baseCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
};

export interface AccessClaims {
  id: number;
  username: string;
  jti: string;
  exp: number;
}

type ChallengePurpose = "2fa" | "set-password";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time string compare that is safe for different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ab = crypto.createHash("sha256").update(a).digest();
  const bb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ab, bb) && a.length === b.length;
}

function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// ---------------------------------------------------------------------------
// Access tokens (JWT, HS256, short-lived)
// ---------------------------------------------------------------------------

export function signAccessToken(userId: number, username: string): string {
  // `id` and `username` stay in the payload because the legacy frontend decodes them;
  // drop them when services/frontend is retired (Phase 1).
  return jwt.sign({ id: userId, username }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.accessTokenTtlSeconds,
    subject: String(userId),
    jwtid: crypto.randomUUID(),
  });
}

function toClaims(payload: jwt.JwtPayload): AccessClaims | null {
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (typeof payload.jti !== "string" || typeof payload.exp !== "number") return null;
  if ((payload as { purpose?: unknown }).purpose !== undefined) return null; // challenge tokens are not access tokens
  return { id, username: String(payload.username ?? ""), jti: payload.jti, exp: payload.exp };
}

/** Verifies signature + expiry. Returns null on any failure. */
export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    return typeof payload === "string" ? null : toClaims(payload);
  } catch {
    return null;
  }
}

/** Verifies the signature but tolerates expiry — only for logout. */
export function verifyAccessTokenIgnoringExpiry(token: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"], ignoreExpiration: true });
    return typeof payload === "string" ? null : toClaims(payload);
  } catch {
    return null;
  }
}

/** Reads the access token from `Authorization: Bearer` first, then the cookie. */
export function readAccessToken(req: FastifyRequest): { token: string; via: "bearer" | "cookie" } | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return { token, via: "bearer" };
  }
  const cookie = req.cookies?.[ACCESS_COOKIE];
  if (cookie) return { token: cookie, via: "cookie" };
  return null;
}

export async function isAccessTokenRevoked(jti: string): Promise<boolean> {
  const row = await prisma.tokenBlacklist.findUnique({ where: { jti }, select: { id: true } });
  return row !== null;
}

export async function revokeAccessToken(claims: AccessClaims): Promise<void> {
  await prisma.tokenBlacklist.upsert({
    where: { jti: claims.jti },
    create: { jti: claims.jti, expiresAt: new Date(claims.exp * 1000) },
    update: {},
  });
}

/** Housekeeping: drop blacklist rows whose token would have expired anyway. */
export async function purgeExpiredBlacklist(): Promise<void> {
  await prisma.tokenBlacklist.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

// ---------------------------------------------------------------------------
// Sessions: access + rotating refresh token in httpOnly cookies
// ---------------------------------------------------------------------------

type Db = Pick<typeof prisma, "refreshToken">;

/** Inserts a refresh-token row and returns the raw token (never stored). */
async function createRefreshRow(db: Db, userId: number, familyId: string): Promise<string> {
  const refresh = randomToken();
  await db.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refresh),
      familyId,
      expiresAt: new Date(Date.now() + config.refreshTokenTtlSeconds * 1000),
    },
  });
  return refresh;
}

function setSessionCookies(reply: FastifyReply, user: { id: number; username: string }, refresh: string): string {
  const access = signAccessToken(user.id, user.username);
  reply.setCookie(ACCESS_COOKIE, access, {
    ...baseCookie,
    path: ACCESS_COOKIE_PATH,
    maxAge: config.accessTokenTtlSeconds,
  });
  reply.setCookie(REFRESH_COOKIE, refresh, {
    ...baseCookie,
    path: AUTH_COOKIE_PATH,
    maxAge: config.refreshTokenTtlSeconds,
  });
  return access;
}

/** Starts a new session (new token family) and sets both cookies. Returns the access token. */
export async function issueSession(reply: FastifyReply, user: { id: number; username: string }): Promise<string> {
  const refresh = await createRefreshRow(prisma, user.id, crypto.randomUUID());
  return setSessionCookies(reply, user, refresh);
}

export function clearSessionCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, { ...baseCookie, path: ACCESS_COOKIE_PATH });
  reply.clearCookie(REFRESH_COOKIE, { ...baseCookie, path: AUTH_COOKIE_PATH });
}

export async function revokeRefreshFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function markOffline(userId: number): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { status: "OFFLINE" } }).catch(() => {});
}

export type RotateResult =
  | { ok: true; user: { id: number; username: string; email: string; avatar: string }; access: string }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "reused" };

// A token presented again this soon after its rotation is two tabs (or a reload) racing,
// not theft: answer with another successor in the same family.
const ROTATION_GRACE_MS = 10_000;

class RotationRefused extends Error {}

/**
 * Exchanges a refresh token for a new access + refresh pair (rotation).
 * Presenting an already-used token outside the grace window revokes the whole family
 * (theft detection) and marks the user OFFLINE. The claim and the successor insert run
 * in one transaction, and no successor is issued into a family that has been revoked.
 */
export async function rotateRefreshToken(req: FastifyRequest, reply: FastifyReply): Promise<RotateResult> {
  const presented = req.cookies?.[REFRESH_COOKIE];
  if (!presented) return { ok: false, reason: "missing" };

  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(presented) },
    select: {
      id: true,
      familyId: true,
      used: true,
      rotatedAt: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: { id: true, username: true, email: true, avatar: true } },
    },
  });
  if (!row) return { ok: false, reason: "invalid" };

  const theft = async () => {
    await revokeRefreshFamily(row.familyId);
    await markOffline(row.user.id);
    req.log.warn({ userId: row.user.id }, "[security] refresh token reuse detected; family revoked");
    return { ok: false as const, reason: "reused" as const };
  };

  if (row.revokedAt) return theft();
  const withinGrace = row.used && !!row.rotatedAt && Date.now() - row.rotatedAt.getTime() < ROTATION_GRACE_MS;
  if (row.used && !withinGrace) return theft();
  if (row.expiresAt <= new Date()) {
    await markOffline(row.user.id);
    return { ok: false, reason: "expired" };
  }

  let refresh: string;
  try {
    refresh = await prisma.$transaction(async (tx) => {
      if (!withinGrace) {
        // Conditional write: if two requests race with the same token only one claims it.
        const claimed = await tx.refreshToken.updateMany({
          where: { id: row.id, used: false, revokedAt: null },
          data: { used: true, rotatedAt: new Date() },
        });
        if (claimed.count !== 1) throw new RotationRefused();
      }
      const revoked = await tx.refreshToken.count({ where: { familyId: row.familyId, revokedAt: { not: null } } });
      if (revoked > 0) throw new RotationRefused();
      return createRefreshRow(tx, row.user.id, row.familyId);
    });
  } catch (err) {
    if (err instanceof RotationRefused) {
      // Lost a race for the claim: re-read, since the winner may have just rotated it (grace).
      const again = await prisma.refreshToken.findUnique({
        where: { id: row.id },
        select: { rotatedAt: true, revokedAt: true },
      });
      const benign = again && !again.revokedAt && again.rotatedAt && Date.now() - again.rotatedAt.getTime() < ROTATION_GRACE_MS;
      if (!benign) return theft();
      refresh = await prisma.$transaction(async (tx) => {
        const revoked = await tx.refreshToken.count({ where: { familyId: row.familyId, revokedAt: { not: null } } });
        if (revoked > 0) throw new RotationRefused();
        return createRefreshRow(tx, row.user.id, row.familyId);
      }).catch((e) => {
        if (e instanceof RotationRefused) return "";
        throw e;
      });
      if (!refresh) return theft();
    } else {
      throw err;
    }
  }

  const access = setSessionCookies(reply, row.user, refresh);
  return { ok: true, user: row.user, access };
}

// ---------------------------------------------------------------------------
// Short-lived challenge tokens (between password and 2FA, or Google and set-password)
// ---------------------------------------------------------------------------

function challengeCookieName(purpose: ChallengePurpose): string {
  return purpose === "2fa" ? TWOFA_CHALLENGE_COOKIE : SETPW_CHALLENGE_COOKIE;
}

export function setChallenge(reply: FastifyReply, purpose: ChallengePurpose, userId: number): void {
  const token = jwt.sign({ purpose }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.challengeTtlSeconds,
    subject: String(userId),
  });
  reply.setCookie(challengeCookieName(purpose), token, {
    ...baseCookie,
    path: AUTH_COOKIE_PATH,
    maxAge: config.challengeTtlSeconds,
  });
}

/** Returns the user id the challenge was issued for, or null. */
export function readChallenge(req: FastifyRequest, purpose: ChallengePurpose): number | null {
  const token = req.cookies?.[challengeCookieName(purpose)];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || payload.purpose !== purpose) return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function clearChallenge(reply: FastifyReply, purpose: ChallengePurpose): void {
  reply.clearCookie(challengeCookieName(purpose), { ...baseCookie, path: AUTH_COOKIE_PATH });
}

// ---------------------------------------------------------------------------
// CSRF: cookie-authenticated, state-changing requests must come from an allowed origin
// ---------------------------------------------------------------------------

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isAllowedOrigin(origin: string | undefined): boolean {
  return !!origin && config.allowedOrigins.includes(origin.replace(/\/+$/, ""));
}

/** True when the request must be refused for CSRF reasons. */
export function failsCsrfCheck(req: FastifyRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return false;
  return !isAllowedOrigin(req.headers.origin);
}
