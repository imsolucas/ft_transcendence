import { Suspense } from "react";
import { AppShell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Logged-in pages: top bar + mobile tab bar. Pages render their own <h1>.
 * The shell reads the URL (usePathname), which is request data under cacheComponents,
 * so it sits behind a Suspense boundary with a same-shaped placeholder.
 */
export default function AppLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <Suspense fallback={<ShellPlaceholder />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

function ShellPlaceholder() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy>
      <div className="h-16 border-b border-border bg-surface-2" />
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 md:px-8">
        <Skeleton style={{ width: 200, height: 24 }} />
      </div>
    </div>
  );
}
