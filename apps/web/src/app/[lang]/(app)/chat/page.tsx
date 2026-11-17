import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { ChatView } from "./chat-view";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.nav.chat };
}

export default function Page() {
  return <ChatView />;
}
