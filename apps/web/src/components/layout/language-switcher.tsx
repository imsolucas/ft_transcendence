"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, LOCALE_LABELS, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { Segmented } from "@/components/ui/primitives";

/** EN / ES / FR segmented control; keeps the current page. */
export function LanguageSwitcher() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
    router.push(`/${next}${rest}${window.location.search}${window.location.hash}`);
  }

  return (
    <Segmented
      mono
      label={t("footer.language")}
      value={locale}
      onChange={change}
      options={LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
    />
  );
}
