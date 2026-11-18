import crypto from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, username } from "better-auth/plugins";
import { config } from "../config.ts";
import { localeFrom, mail } from "../email/mailer.ts";
import { log } from "../log.ts";
import { prisma } from "../db/client.ts";

/**
 * Better Auth owns sign-up, sign-in (username or email + password, Google), sessions,
 * cookies, CSRF/origin checks, auth rate limits and TOTP two-factor.
 * Served at /api/auth/* (see routes/authRoutes.ts). Docs: https://www.better-auth.com/docs
 */
export const auth = betterAuth({
  appName: "ft_transcendence",
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

  // Verify addresses after sign-up (not required to play: dev accounts and Google work as before)
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }, request) => {
      void mail.verify(user.email, url, localeFrom(request), log);
    },
  },

  socialProviders: config.google
    ? {
        google: {
          clientId: config.google.clientId,
          clientSecret: config.google.clientSecret,
          // Google accounts always come with a verified email
          prompt: "select_account",
        },
      }
    : {},

  account: {
    accountLinking: {
      // Only link Google to an existing account when the provider is trusted AND the
      // existing account's email is verified; otherwise a Google sign-in for someone
      // else's unverified email could take over that account.
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // extend at most once a day
  },

  // Profile changes go through our /api/me (validated handle, avatar upload pipeline);
  // Better Auth's own update endpoints would bypass those checks.
  disabledPaths: ["/update-user", "/change-email", "/delete-user"],

  databaseHooks: {
    user: {
      create: {
        // Google sign-ups (and any sign-up without a username) get a unique handle
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
    twoFactor({ issuer: "ft_transcendence" }),
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
