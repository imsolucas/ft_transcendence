import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { SettingsView } from "./settings-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.nav.settings };
}

export default function Page() {
  return <SettingsView />;
}
