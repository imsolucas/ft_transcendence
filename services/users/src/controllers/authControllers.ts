import type { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import speakeasy from "speakeasy";
import { prisma } from "../db/client.ts";
import { config } from "../config.ts";
import { validateSignupInput, validateLoginInput, isValidEmail, isValidPassword } from "../utils/validation.ts";
import {
  clearChallenge,
  clearSessionCookies,
  failsCsrfCheck,
  issueSession,
  readAccessToken,
  readChallenge,
  REFRESH_COOKIE,
  revokeAccessToken,
  revokeRefreshFamily,
  rotateRefreshToken,
  setChallenge,
  sha256,
  verifyAccessTokenIgnoringExpiry,
} from "../auth/tokens.ts";

const DEFAULT_AVATAR = "https://i.pravatar.cc/150?u=default";

// Compared against when the user doesn't exist, so unknown usernames cost the same time.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-real-password", config.bcryptCost);

const ALREADY_ONLINE = {
  error: "User is already logged in on another device or browser",
  message: "Please log out from the other device before logging in here.",
};

type SessionUser = { id: number; username: string; email: string; avatar: string };

function publicUser(user: SessionUser) {
  return { id: user.id, username: user.username, email: user.email, avatar: user.avatar };
}

/** Marks the user ONLINE, sets the session cookies and returns the login response body. */
async function completeLogin(reply: FastifyReply, user: SessionUser) {
  await prisma.user.update({ where: { id: user.id }, data: { status: "ONLINE" } });
  const token = await issueSession(reply, user);
  // `token` is still returned for the legacy frontend, which keeps it in localStorage.
  // The new frontend relies on the httpOnly cookies only. Remove in Phase 1.
  return { token, user: publicUser(user) };
}

// POST /auth/signup
export async function signup(req: FastifyRequest, reply: FastifyReply) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const validation = validateSignupInput(name, email, password);
  if (!validation.valid) {
    return reply.code(400).send({ error: validation.error });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  const existingUsername = await prisma.user.findUnique({ where: { username: trimmedName }, select: { id: true } });
  if (existingUsername) {
    return reply.code(409).send({ error: "User name already exists." });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail }, select: { id: true } });
  if (existingEmail) {
    return reply.code(409).send({ error: "Email already registered." });
  }

  const hashed = await bcrypt.hash(password, config.bcryptCost);
  const user = await prisma.user.create({
    data: {
      username: trimmedName,
      email: trimmedEmail,
      password: hashed,
      avatar: DEFAULT_AVATAR,
    },
  });

  return reply.code(201).send(publicUser(user));
}

// POST /auth/login
export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { name, password } = req.body as { name: string; password: string };

  const validation = validateLoginInput(name, password);
  if (!validation.valid) {
    return reply.code(400).send({ error: validation.error });
  }

  const user = await prisma.user.findUnique({ where: { username: name.trim() } });
  const hash = user?.password ? user.password : DUMMY_HASH;
  const valid = await bcrypt.compare(password, hash);
  if (!user || !user.password || !valid) {
    return reply.code(401).send({ error: "Invalid username or password" });
  }

  if (user.status === "ONLINE") {
    return reply.code(403).send(ALREADY_ONLINE);
  }

  if (user.is2FAEnabled) {
    // The 2FA step is bound to this browser by an httpOnly challenge cookie,
    // so /auth/verify-2fa can't be called for an arbitrary user id.
    setChallenge(reply, "2fa", user.id);
    return reply.code(202).send({ twoFARequired: true, id: user.id });
  }

  return reply.send(await completeLogin(reply, user));
}

// POST /auth/google
const googleClient = new OAuth2Client();

export async function googleAuth(req: FastifyRequest, reply: FastifyReply) {
  const { idToken } = req.body as { idToken: string };

  if (!idToken) {
    return reply.code(400).send({ error: "Missing Google ID token" });
  }
  if (!config.googleClientId) {
    req.log.error("GOOGLE_CLIENT_ID is not configured");
    return reply.code(503).send({ error: "Google sign-in is not configured" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    return reply.code(400).send({ error: "Invalid Google token" });
  }

  if (!payload || !payload.email || !payload.email_verified || !isValidEmail(payload.email)) {
    return reply.code(400).send({ error: "Invalid Google token" });
  }

  const { name, picture } = payload;
  const normalizedEmail = payload.email.toLowerCase().trim();

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    const base = name
      ? name.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 30)
      : normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 30);
    const username = (base || "user").padEnd(3, "0");

    let finalUsername = username;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username: finalUsername }, select: { id: true } })) {
      finalUsername = `${username.substring(0, 30 - String(counter).length)}${counter}`;
      counter++;
    }

    user = await prisma.user.create({
      data: {
        username: finalUsername,
        email: normalizedEmail,
        avatar: picture ?? DEFAULT_AVATAR,
        password: "",
      },
    });
  }

  if (user.status === "ONLINE") {
    return reply.code(403).send(ALREADY_ONLINE);
  }

  const needsPassword = !user.password || user.password.trim() === "";
  if (needsPassword) {
    // Bound to this browser; /auth/set-password reads it instead of trusting a body userId.
    setChallenge(reply, "set-password", user.id);
    return reply.code(202).send({
      passwordRequired: true,
      userId: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      message: "Password required. Please set a password to continue.",
    });
  }

  return reply.send(await completeLogin(reply, user));
}

// Per-account cap on wrong TOTP codes (the IP rate limit alone is bypassed by rotating
// IPs). In-memory: single users-service instance; move to the DB/Redis if that changes.
const TWOFA_MAX_FAILURES = 5;
const TWOFA_LOCKOUT_MS = 15 * 60 * 1000;
const twoFactorFailures = new Map<number, { count: number; firstAt: number }>();

function twoFactorLockedOut(userId: number): boolean {
  const entry = twoFactorFailures.get(userId);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > TWOFA_LOCKOUT_MS) {
    twoFactorFailures.delete(userId);
    return false;
  }
  return entry.count >= TWOFA_MAX_FAILURES;
}

function recordTwoFactorFailure(userId: number): void {
  const entry = twoFactorFailures.get(userId);
  if (!entry || Date.now() - entry.firstAt > TWOFA_LOCKOUT_MS) {
    twoFactorFailures.set(userId, { count: 1, firstAt: Date.now() });
  } else {
    entry.count++;
  }
}

// POST /auth/verify-2fa
export async function verify2FA(req: FastifyRequest, reply: FastifyReply) {
  const { userId: claimedUserId, code } = req.body as { userId?: number; code: string };

  const userId = readChallenge(req, "2fa");
  if (!userId || (claimedUserId !== undefined && claimedUserId !== userId)) {
    return reply.code(401).send({ error: "2FA session expired. Please log in again." });
  }
  if (!/^\d{6}$/.test(code ?? "")) {
    return reply.code(400).send({ error: "Invalid 2FA code" });
  }

  if (twoFactorLockedOut(userId)) {
    return reply.code(429).send({ error: "Too many 2FA attempts. Try again in 15 minutes." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.is2FAEnabled || !user.twoFASecret) {
    return reply.code(401).send({ error: "2FA not enabled for this user" });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token: code,
    window: 1,
  });
  if (!verified) {
    recordTwoFactorFailure(userId);
    return reply.code(401).send({ error: "Invalid 2FA code" });
  }
  twoFactorFailures.delete(userId);

  if (user.status === "ONLINE") {
    return reply.code(403).send(ALREADY_ONLINE);
  }

  clearChallenge(reply, "2fa");
  return reply.send(await completeLogin(reply, user));
}

// POST /auth/set-password (first password for a Google-created account)
export async function setPassword(req: FastifyRequest, reply: FastifyReply) {
  const { userId: claimedUserId, password } = req.body as { userId?: number; password: string };

  const userId = readChallenge(req, "set-password");
  if (!userId || (claimedUserId !== undefined && claimedUserId !== userId)) {
    return reply.code(401).send({ error: "Session expired. Please sign in with Google again." });
  }
  if (!isValidPassword(password)) {
    return reply.code(400).send({ error: "Password does not meet the requirements." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return reply.code(404).send({ error: "User not found." });
  }
  if (user.password && user.password.trim() !== "") {
    return reply.code(400).send({ error: "User already has a password set." });
  }
  if (user.status === "ONLINE") {
    return reply.code(403).send({
      error: ALREADY_ONLINE.error,
      message: "Please log out from the other device before setting a password here.",
    });
  }

  const hashed = await bcrypt.hash(password, config.bcryptCost);
  // Conditional write: only succeeds while the password is still empty.
  const updated = await prisma.user.updateMany({
    where: { id: userId, password: "" },
    data: { password: hashed },
  });
  if (updated.count !== 1) {
    return reply.code(400).send({ error: "User already has a password set." });
  }

  clearChallenge(reply, "set-password");
  const body = await completeLogin(reply, user);
  return reply.send({ ...body, message: "Password set successfully." });
}

// POST /auth/refresh — rotate the refresh token, issue a new access token
export async function refresh(req: FastifyRequest, reply: FastifyReply) {
  if (failsCsrfCheck(req)) {
    return reply.code(403).send({ error: "Forbidden" });
  }

  const result = await rotateRefreshToken(req, reply);
  if (!result.ok) {
    clearSessionCookies(reply);
    return reply.code(401).send({ error: "Session expired. Please log in again." });
  }
  return reply.send({ token: result.access, user: publicUser(result.user) });
}

// POST /auth/logout
export async function logout(req: FastifyRequest, reply: FastifyReply) {
  const found = readAccessToken(req);
  // Without a Bearer header, this request is authorised by cookies alone (access and/or
  // the Lax refresh cookie), so it must come from an allowed origin.
  if (found?.via !== "bearer" && failsCsrfCheck(req)) {
    return reply.code(403).send({ error: "Forbidden" });
  }

  // Signature must be valid; expiry is tolerated so an expired session can still log out.
  const claims = found ? verifyAccessTokenIgnoringExpiry(found.token) : null;

  if (claims) {
    await revokeAccessToken(claims).catch((err) => req.log.error({ err }, "logout: blacklist failed"));
    await prisma.user
      .update({ where: { id: claims.id }, data: { status: "OFFLINE" } })
      .catch((err) => req.log.error({ err }, "logout: status update failed"));
  }

  const presentedRefresh = req.cookies?.[REFRESH_COOKIE];
  if (presentedRefresh) {
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(presentedRefresh) },
      select: { familyId: true, userId: true },
    });
    if (row && (!claims || row.userId === claims.id)) {
      await revokeRefreshFamily(row.familyId);
      if (!claims) {
        await prisma.user
          .update({ where: { id: row.userId }, data: { status: "OFFLINE" } })
          .catch((err) => req.log.error({ err }, "logout: status update failed"));
      }
    }
  }

  clearSessionCookies(reply);
  return reply.send({ message: "Logged out successfully" });
}
