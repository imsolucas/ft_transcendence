import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { PlayView } from "./play-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.common.play };
}

export default function Page() {
  // The mode/room code come from the query string (useSearchParams needs a boundary)
  return (
    <Suspense>
      <PlayView />
    </Suspense>
  );
}
