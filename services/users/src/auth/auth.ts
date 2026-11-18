import crypto from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { captcha, twoFactor, username } from "better-auth/plugins";
import { isBreachedPassword } from "./breached.ts";
import { createAuthMiddleware, APIError, getSessionFromCtx } from "better-auth/api";
import { passkey } from "@better-auth/passkey";
import { noteSignIn } from "./devices.ts";
import { config } from "../config.ts";
import { localeFrom, mail } from "../email/mailer.ts";
import { log } from "../log.ts";
import { prisma } from "../db/client.ts";

/** Sessions older than this must sign in again for sensitive actions (10 minutes). */
export const FRESH_AGE_S = 10 * 60;

/**
 * Better Auth owns sign-up, sign-in (username or email + password, passkeys), sessions,
 * cookies, CSRF/origin checks, auth rate limits and TOTP two-factor.
 * Served at /api/auth/* (see auth/routes.ts). Docs: https://www.better-auth.com/docs
 */
export const auth = betterAuth({
  appName: "VOLLEY.EXE",
  baseURL: config.publicOrigin,
  basePath: "/api/auth",
  secret: config.authSecret,
  trustedOrigins: [config.publicOrigin],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  user: {
    // Existing column names in the Users table
    fields: {
      image: "avatar",
      createdAt: "created_at",
      updatedAt: "last_updated",
    },
    additionalFields: {
      // Presence is set by the server (game sockets), never by the client
      status: { type: "string", required: false, defaultValue: "OFFLINE", input: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Sign-in waits for a verified address (REQUIRE_EMAIL_VERIFICATION=false turns that off when
    // there is no email provider). Sign-up never signs in by itself (autoSignIn: false), which in
    // Better Auth 1.7 also makes it answer the same whether or not the email is taken, with or
    // without verification (no account enumeration); the owner gets an email when one can be sent.
    requireEmailVerification: config.requireEmailVerification,
    autoSignIn: false,
    onExistingUserSignUp: async ({ user }, request) => {
      const locale = localeFrom(request);
      void mail.existing(user.email, `${config.publicOrigin}/${locale}/login`, locale, log);
    },
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // "Forgot password?": the link lands on /<lang>/reset-password?token=…
    sendResetPassword: async ({ user, url }, request) => {
      void mail.reset(user.email, url, localeFrom(request), log);
    },
    resetPasswordTokenExpiresIn: 60 * 60,
    // a reset ends every existing session (whoever had the old password is logged out)
    revokeSessionsOnPasswordReset: true,
  },

  // Sign-in waits for a verified address (see emailAndPassword.requireEmailVerification)
  emailVerification: {
    sendOnSignUp: config.requireEmailVerification,
    // an unverified account that tries to sign in gets a fresh link
    sendOnSignIn: config.requireEmailVerification,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }, request) => {
      void mail.verify(user.email, url, localeFrom(request), log);
    },
  },

  // No social sign-in for now (Google was removed 2026-11-18). If a provider comes back, keep
  // account linking limited to trusted providers + verified local emails.
  account: {
    accountLinking: { enabled: false },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // extend at most once a day
    // sensitive actions (passkeys, account deletion) need a sign-in this recent
    freshAge: FRESH_AGE_S,
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // refuse passwords from known breaches (fails open if the check service is down)
      const body = (ctx.body ?? {}) as { password?: unknown; newPassword?: unknown };
      const candidate = ctx.path === "/sign-up/email" ? body.password : ctx.path === "/change-password" || ctx.path === "/reset-password" ? body.newPassword : undefined;
      if (typeof candidate === "string" && candidate.length >= 8 && (await isBreachedPassword(candidate))) {
        throw new APIError("BAD_REQUEST", { message: "This password has appeared in a data breach. Choose another one.", code: "PASSWORD_COMPROMISED" });
      }
      // a password change always signs every other device out (whoever had the old one)
      if (ctx.path === "/change-password" && ctx.body && typeof ctx.body === "object") {
        return { context: { ...ctx, body: { ...(ctx.body as object), revokeOtherSessions: true } } };
      }
      // adding or removing a passkey needs a recent sign-in (a stolen session cookie alone isn't enough)
      if (ctx.path === "/passkey/generate-register-options" || ctx.path === "/passkey/delete-passkey") {
        const session = ctx.context.session ?? (await getSessionFromCtx(ctx));
        if (session && Date.now() - new Date(session.session.createdAt).getTime() > FRESH_AGE_S * 1000) {
          throw new APIError("FORBIDDEN", { message: "Sign in again to change your passkeys.", code: "REAUTH" });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // turning two-factor on or off signs every other device out
      if ((ctx.path === "/two-factor/enable" || ctx.path === "/two-factor/disable") && !(ctx.context.returned instanceof Error)) {
        const current = ctx.context.newSession ?? ctx.context.session;
        if (current) {
          // the 2FA change itself succeeded: a failure here is logged, never turned into a 500
          await prisma.session
            .deleteMany({ where: { userId: Number(current.user.id), NOT: { token: current.session.token } } })
            .catch((err: Error) => log.error({ err: err.message }, "could not revoke other sessions after a 2FA change"));
        }
      }
    }),
  },

  // Profile changes go through our /api/me (validated handle, avatar upload pipeline);
  // Better Auth's own update endpoints would bypass those checks.
  disabledPaths: ["/update-user", "/change-email", "/delete-user"],

  databaseHooks: {
    session: {
      create: {
        // a sign-in from a browser/OS this account hasn't used before → email the owner
        after: async (session, context) => {
          void noteSignIn(Number(session.userId), session.userAgent, localeFrom(context?.request));
        },
      },
    },
    user: {
      create: {
        // any sign-up without a username gets a unique handle
        before: async (user) => {
          const data = user as typeof user & { username?: string; displayUsername?: string };
          // reserved for erased accounts (.invalid can never be a real mailbox)
          if (data.email.toLowerCase().endsWith(".invalid")) return false;
          if (data.username) return;
          const handle = await uniqueHandle(data.name || data.email.split("@")[0]);
          return { data: { ...user, username: handle, displayUsername: handle, name: handle } };
        },
      },
    },
  },

  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    twoFactor({ issuer: "VOLLEY.EXE" }),
    passkey({ rpID: new URL(config.publicOrigin).hostname, rpName: "VOLLEY.EXE", origin: config.publicOrigin }),
    ...(config.turnstile
      ? [captcha({ provider: "cloudflare-turnstile", secretKey: config.turnstile.secretKey, endpoints: ["/sign-up/email", "/sign-in/email", "/sign-in/username", "/request-password-reset", "/send-verification-email"] })]
      : []),
  ],

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/username": { window: 60, max: 10 },
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/two-factor/*": { window: 60, max: 10 },
      // these send email: keep them tight so the app can't be used to flood an inbox
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "ft",
    useSecureCookies: true,
    database: { generateId: "serial" },
    // Caddy is the only proxy in front; it sets X-Forwarded-For
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
});

export type Session = typeof auth.$Infer.Session;

/** "Lucas Deng" → "lucas_deng", "lucas_deng2", … (3–30 chars of [a-z0-9_.]) */
async function uniqueHandle(source: string): Promise<string> {
  let base = source
    .normalize("NFKD")
    .replace(/[^\w.]+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .toLowerCase()
    .slice(0, 26);
  if (base.length < 3) base = `player_${base}`.slice(0, 26);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base.slice(0, 18)}_${crypto.randomBytes(4).toString("hex")}`;
}
