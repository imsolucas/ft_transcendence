"use client";

import { ErrorView } from "@/components/layout/system-views";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView digest={error.digest} onRetry={reset} />;
}
