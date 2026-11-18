import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { OfflineView } from "@/components/layout/system-views";

// Static and session-free: the service worker precaches it anonymously and serves it
// whenever a navigation fails without a network.
export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return { title: dict.offline.metaTitle, robots: { index: false } };
}

export default function Page() {
  return <OfflineView />;
}
