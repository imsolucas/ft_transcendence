import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { ArcadeView } from "./arcade-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.nav.arcade };
}

export default function Page() {
  return <ArcadeView />;
}
