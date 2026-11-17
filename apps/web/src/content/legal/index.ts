import type { Locale } from "@/i18n/config";
import type { LegalDoc } from "./types";
import * as en from "./en";
import * as es from "./es";
import * as fr from "./fr";

const docs: Record<Locale, { privacy: LegalDoc; terms: LegalDoc }> = { en, es, fr };

export function getLegal(locale: Locale, kind: "privacy" | "terms"): LegalDoc {
  return docs[locale][kind];
}
