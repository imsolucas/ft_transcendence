import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { getLegal } from "@/content/legal";
import { LegalPage } from "@/components/layout/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.footer.terms };
}

export default async function Page() {
  const { locale, dict } = await getDictionary();
  return <LegalPage title={dict.legal.termsTitle} doc={getLegal(locale, "terms")} />;
}
