import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { JoinView } from "./join-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.invite.title };
}

export default function Page() {
  // the code is only known at request time: useParams needs a Suspense boundary (cacheComponents)
  return (
    <Suspense>
      <JoinView />
    </Suspense>
  );
}
