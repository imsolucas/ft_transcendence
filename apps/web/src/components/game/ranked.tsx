"use client";

import { useState } from "react";
import useSWR from "swr";
import { Shield, ShieldQuestion } from "lucide-react";
import type { Division } from "shared";
import { useI18n } from "@/i18n/I18nProvider";
import { fetcher } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { RankedMe } from "@/lib/types";
import { Skeleton } from "@/components/ui/primitives";

/** Division badge: an icon and the word (never colour alone); placement shows "Unranked · 3 left". */
export function DivisionBadge({ division, placementLeft, className }: { division: Division | null; placementLeft?: number; className?: string }) {
  const { t } = useI18n();
  if (!division) {
    return (
      <span className={cn("division division-none", className)}>
        <ShieldQuestion className="ico" aria-hidden />
        {placementLeft ? t("ranked.placement", { n: placementLeft }) : t("ranked.unranked")}
      </span>
    );
  }
  return (
    <span className={cn("division", `division-${division}`, className)}>
      <Shield className="ico" aria-hidden />
      {t(`ranked.division.${division}`)}
    </span>
  );
}

/** "Gold · 1580" for a player (profile header, lobby). */
export function RankedStandingLine({ path }: { path: string }) {
  const { t } = useI18n();
  const { data, error } = useSWR<RankedMe>(path, fetcher, { revalidateOnFocus: false });
  if (error) return null;
  if (!data) return <Skeleton className="!h-6 w-40" />;
  const s = data.standing;
  return (
    <span className="row wrap !gap-2">
      <DivisionBadge division={s.division} placementLeft={s.placementLeft} />
      {s.games > 0 && (
        <span className="t-caption muted">
          <span className="num">{s.rating}</span> · {t("ranked.record", { w: s.wins, l: s.losses })}
        </span>
      )}
    </span>
  );
}

/** "Season 3 · ends in 12 days" */
export function useSeasonLabel(season?: { number: number; endsAt: string }) {
  const { t } = useI18n();
  // read the clock once per mount (a day count doesn't need to tick)
  const [now] = useState(() => Date.now());
  if (!season) return "";
  const days = Math.max(0, Math.ceil((new Date(season.endsAt).getTime() - now) / 86_400_000));
  return `${t("ranked.season", { n: season.number })} · ${days <= 1 ? t("ranked.endsSoon") : t("ranked.endsIn", { n: days })}`;
}
