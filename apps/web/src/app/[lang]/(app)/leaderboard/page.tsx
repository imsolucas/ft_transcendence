import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { LeaderboardView } from "./leaderboard-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.nav.leaderboard };
}

export default function Page() {
  return <LeaderboardView />;
}
