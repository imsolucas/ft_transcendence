import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { WatchView } from "./watch-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.watch.title };
}

export default function Page() {
  // ?room= / ?user= choose the match (useSearchParams needs a boundary)
  return (
    <Suspense>
      <WatchView />
    </Suspense>
  );
}
