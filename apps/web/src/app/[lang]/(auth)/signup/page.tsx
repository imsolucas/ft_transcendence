import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.auth.signupTitle };
}

export default function Page() {
  // ?error= from a failed Google sign-in needs useSearchParams (behind a boundary)
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
