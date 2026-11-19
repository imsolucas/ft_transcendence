import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { CyclesSolo } from "./cycles-solo";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.cyclesSolo.title };
}

export default function Page() {
  return (
    <Suspense>
      <CyclesSolo />
    </Suspense>
  );
}
