"use client";

import useSWR from "swr";
import { fetcher, ApiError } from "./api";
import type { Me } from "./types";

/** The signed-in user (null when signed out). Shared cache key "/api/me". */
export function useMe() {
  const { data, error, isLoading, mutate } = useSWR<Me>("/api/me", fetcher, {
    shouldRetryOnError: (err) => !(err instanceof ApiError && err.status === 401),
    revalidateOnFocus: false,
  });
  const signedOut = error instanceof ApiError && error.status === 401;
  return { me: signedOut ? null : (data ?? null), isLoading: isLoading && !signedOut, signedOut, error: signedOut ? undefined : error, mutate };
}

/**
 * Signed in? via Better Auth's session endpoint, which answers 200 + null for guests (no 401 in
 * the console, unlike /api/me), so pages open to guests can ask. null while loading.
 */
export function useSignedIn(): boolean | null {
  const { data, isLoading } = useSWR<{ user?: unknown } | null>("/api/auth/get-session", fetcher, { revalidateOnFocus: false });
  if (isLoading) return null;
  return !!data?.user;
}
