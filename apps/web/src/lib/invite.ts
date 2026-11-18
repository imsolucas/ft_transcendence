/** Room codes are 8 hex characters (the game service's private-room ids). */
export const ROOM_CODE = /^[0-9a-f]{8}$/;

/**
 * Shareable invite link. Language-neutral on purpose: proxy.ts sends the friend to their own
 * language, then through login/signup if needed, and back to /<lang>/join/<code>.
 */
export function inviteUrl(code: string, kind: "match" | "tournament" = "match"): string {
  const url = new URL(`/join/${code.toLowerCase()}`, window.location.origin);
  if (kind === "tournament") url.searchParams.set("kind", "tournament");
  return url.href;
}

/** Only same-site, locale-prefixed paths are allowed as a post-login destination. */
export function safeNext(next: string | null, fallback: string): string {
  return next && /^\/(en|es|fr)(\/|$)/.test(next) && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
