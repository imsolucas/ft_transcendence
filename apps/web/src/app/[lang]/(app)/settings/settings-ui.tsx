"use client";

import { Copy } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { Button, IconButton } from "@/components/ui/button";
import { Callout } from "@/components/ui/form";
import { cn } from "@/lib/cn";

/** Copy to the clipboard with a toast either way. */
export function useCopy() {
  const { t } = useI18n();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("settings.copyFailed"));
    }
  };
}

/** Mono value in a dashed box with an icon copy button (setup key, codes). */
export function CodeBox({
  value,
  display,
  copyLabel,
  className,
}: {
  value: string;
  /** Shown text when it differs from the copied value (e.g. grouped in fours) */
  display?: string;
  /** Adds an icon copy button; leave out when a visible Copy button sits next to the box */
  copyLabel?: string;
  className?: string;
}) {
  const copy = useCopy();
  return (
    <span
      className={cn(
        "inline-flex h-10 max-w-full items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg pl-3 font-mono text-[14px] font-medium",
        copyLabel ? "pr-1" : "pr-3",
        className,
      )}
    >
      <span className="truncate select-all">{display ?? value}</span>
      {copyLabel && (
        <IconButton size="sm" label={copyLabel} onClick={() => copy(value)}>
          <Copy className="ico" aria-hidden />
        </IconButton>
      )}
    </span>
  );
}

/** Error in place with a retry button. */
export function LoadError({ onRetry, children }: { onRetry: () => void; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <Callout tone="error">
      <div className="row between wrap">
        <span>{children ?? t("common.error")}</span>
        <Button size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    </Callout>
  );
}

/** One preference row: label + caption on the left, control on the right, divider above. */
export function SettingRow({
  label,
  body,
  children,
  labelId,
}: {
  label: ReactNode;
  body?: ReactNode;
  children: ReactNode;
  labelId?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-4 first:border-t-0 first:pt-0">
      <span className="stack min-w-[180px] grow" style={{ gap: 0 }}>
        <span className="t-strong" id={labelId}>
          {label}
        </span>
        {body && <span className="t-caption subtle">{body}</span>}
      </span>
      {children}
    </div>
  );
}

export const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;
