import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { DailyView } from "./daily-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.daily.lobbyTile };
}

export default function Page() {
  return (
    <Suspense>
      <DailyView />
    </Suspense>
  );
}
