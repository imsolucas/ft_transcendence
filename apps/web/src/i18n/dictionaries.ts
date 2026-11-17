import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default as Dictionary),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default as Dictionary),
};

/** Server Components: the dictionary for the current [lang] segment. */
export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return { locale, dict: await dictionaries[locale]() };
}
