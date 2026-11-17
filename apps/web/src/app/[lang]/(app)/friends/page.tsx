import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { FriendsView } from "./friends-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.nav.friends };
}

export default function Page() {
  return <FriendsView />;
}
