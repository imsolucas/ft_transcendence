import { AppShell } from "@/components/layout/shell";

/** Logged-in pages: top bar + mobile tab bar. Pages render their own <h1>. */
export default function AppLayout({ children }: LayoutProps<"/[lang]">) {
  return <AppShell>{children}</AppShell>;
}
