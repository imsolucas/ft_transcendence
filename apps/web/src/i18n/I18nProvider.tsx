"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";

type Ctx = { locale: Locale; dict: Dictionary };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, dict, children }: Ctx & { children: ReactNode }) {
  return <I18nContext value={{ locale, dict }}>{children}</I18nContext>;
}

function lookup(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), dict);
}

/**
 * t("lobby.findMatch") or t("matches.count", { count: 3 }).
 * Placeholders use {name}. A missing key returns the key itself so it is visible in review.
 */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  const { locale, dict } = ctx;
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = lookup(dict, key);
      if (typeof value !== "string") return key;
      return vars ? value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : value;
    },
    [dict]
  );
  /** Prefix a path with the current locale: href("/lobby") → "/fr/lobby" */
  const href = useCallback((path: string) => `/${locale}${path === "/" ? "" : path}`, [locale]);
  return { t, locale, href };
}
