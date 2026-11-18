import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { PartyView } from "./party-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.party.title };
}

export default function Page() {
  // mode and room code come from the query string (useSearchParams needs a boundary)
  return (
    <Suspense>
      <PartyView />
    </Suspense>
  );
}
