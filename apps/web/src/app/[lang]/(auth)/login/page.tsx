import { Suspense } from "react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.auth.loginTitle };
}

export default function Page() {
  // useSearchParams (the ?next= destination) needs a Suspense boundary
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
