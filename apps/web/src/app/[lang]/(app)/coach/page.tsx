import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { CoachView } from "./coach-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.coach.title };
}

export default function Page() {
  return <CoachView />;
}
