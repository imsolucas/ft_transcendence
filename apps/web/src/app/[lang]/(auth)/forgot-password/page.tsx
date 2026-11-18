import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.auth.forgotTitle };
}

export default function Page() {
  return <ForgotForm />;
}
