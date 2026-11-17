import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { LobbyView } from "./lobby-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.nav.lobby };
}

export default function Page() {
  return <LobbyView />;
}
