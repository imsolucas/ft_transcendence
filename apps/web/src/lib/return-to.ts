"use client";

import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useSignedIn } from "@/lib/session";

/**
 * Where a game page was opened from, carried as ?from=<origin>. An allow-list of names, never a
 * URL, so the parameter can't send anyone off-site.
 */
const ORIGINS = { arcade: "/arcade" } as const;
export type ReturnOrigin = keyof typeof ORIGINS;

/** `path` with ?from=<origin> added (keeps any query it already has) */
export function withFrom(path: string, from: ReturnOrigin): string {
  return `${path}${path.includes("?") ? "&" : "?"}from=${from}`;
}

/**
 * Where Back / Cancel / Leave should go: back to where the player came from (the arcade hall),
 * otherwise the lobby (the landing page for guests). Needs a <Suspense> boundary above it.
 */
export function useReturnTo(): { href: string; label: string } {
  const { t, href } = useI18n();
  const from = useSearchParams().get("from");
  const signedIn = useSignedIn();
  if (from && from in ORIGINS) return { href: href(ORIGINS[from as ReturnOrigin]), label: t("common.backToArcade") };
  if (signedIn === false) return { href: href("/"), label: t("common.back") };
  return { href: href("/lobby"), label: t("common.backToLobby") };
}
