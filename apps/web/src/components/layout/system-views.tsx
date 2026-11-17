"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

/** 404: one line on what happened, one on what is safe, then the way out. */
export function NotFoundView() {
  const { t, href } = useI18n();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="pix pix-lg c-cyan">{t("system.notFoundTitle")}</p>
      <h1 className="pix pix-sm">{t("system.notFoundLine")}</h1>
      <p className="muted max-w-[420px]">{t("system.notFoundBody")}</p>
      <Button asChild variant="primary" glow="sm">
        <Link href={href("/lobby")} className="no-underline">
          {t("common.backToLobby")}
        </Link>
      </Button>
    </main>
  );
}

export function ErrorView({ digest, onRetry }: { digest?: string; onRetry: () => void }) {
  const { t, href } = useI18n();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="t-title">{t("system.errorTitle")}</h1>
      <p className="muted max-w-[420px]">{t("system.errorBody")}</p>
      {digest && (
        <p className="t-caption subtle">
          {t("system.errorId")}: <span className="num num-sm">{digest}</span>
        </p>
      )}
      <div className="row wrap justify-center">
        <Button variant="primary" glow="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
        <Button asChild>
          <Link href={href("/lobby")} className="no-underline">
            {t("common.backToLobby")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
