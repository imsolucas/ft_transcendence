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
