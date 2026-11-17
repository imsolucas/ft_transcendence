import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { LocalGame } from "./local-game";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.lobby.local };
}

export default function Page() {
  return <LocalGame />;
}
