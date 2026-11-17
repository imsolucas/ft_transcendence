"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

/** Small mono uppercase label above a group of rows (the design's sec-title). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="font-mono text-[12px] leading-4 font-medium uppercase tracking-[0.08em] text-fg-subtle">{children}</h3>;
}

/** Skeleton rows: avatar circle + two text bars, like the preview's loading state. */
export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  const widths = [
    [60, 36],
    [52, 42],
    [44, 48],
    [36, 54],
  ];
  return (
    <div className="stack stack-3" aria-busy="true" role="status" aria-label={t("common.loading")}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="row row-3 px-3 py-2" aria-hidden>
          <span className="skel skel-circle" />
          <span className="stack grow">
            <span className="skel" style={{ width: `${widths[i % 4][0]}%` }} />
            <span className="skel" style={{ width: `${widths[i % 4][1]}%`, height: 10 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Per-panel error with a retry, in place of the panel's content. */
export function PanelError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  const { t } = useI18n();
  const body = error instanceof ApiError && error.status === 0 ? t("common.networkError") : t("common.error");
  return (
    <div role="alert">
      <EmptyState
        icon={<AlertTriangle className="ico c-red" aria-hidden />}
        title={title}
        body={body}
        action={
          <Button type="button" onClick={onRetry}>
            <RotateCw className="ico" aria-hidden />
            <span>{t("common.retry")}</span>
          </Button>
        }
      />
    </div>
  );
}
