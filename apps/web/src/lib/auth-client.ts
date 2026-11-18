"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

/**
 * Better Auth client. The auth server is on the same origin (Caddy routes /api/auth/*
 * to the users service), so no baseURL is needed beyond the base path.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    usernameClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        // Handled by the login form, which shows the code step in place.
      },
    }),
    passkeyClient(),
  ],
});
