import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.auth.resetTitle };
}

export default function Page() {
  // the token arrives as ?token= (useSearchParams needs a Suspense boundary)
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
