import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, username } from "better-auth/plugins";
import { config } from "../config.ts";
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
