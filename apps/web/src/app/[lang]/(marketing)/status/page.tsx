import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { StatusView } from "./status-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.footer.status };
}

export default function Page() {
  return <StatusView />;
}
