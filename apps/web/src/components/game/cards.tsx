"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { MatchSummary, PublicUser } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar, Badge, PresenceDot } from "@/components/ui/primitives";

/** "3 min ago" style relative time using the dictionary. */
export function useTimeAgo() {
  const { t, locale } = useI18n();
  return (iso: string) => {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("match.ago.now");
    if (min < 60) return t("match.ago.minutes", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("match.ago.hours", { n: h });
    const d = Math.floor(h / 24);
    if (d < 30) return t("match.ago.days", { n: d });
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  };
}

/** Result badge: arrow + word, never colour alone. */
export function ResultBadge({ result }: { result: MatchSummary["result"] }) {
  const { t } = useI18n();
  if (result === "win") return <Badge tone="green" icon={<ArrowUpRight className="ico" aria-hidden />}>{t("match.win")}</Badge>;
  if (result === "loss") return <Badge tone="red" icon={<ArrowDownRight className="ico" aria-hidden />}>{t("match.loss")}</Badge>;
  return <Badge icon={<Minus className="ico" aria-hidden />}>{t("match.draw")}</Badge>;
}

/** PlayerChip: avatar + name + presence word (shape + word). Links to the profile. */
export function PlayerChip({
  user,
  meta,
  ring,
  right,
  link = true,
  showPresence = true,
}: {
  user: PublicUser;
  meta?: React.ReactNode;
  ring?: "you" | "opp";
  right?: boolean;
  link?: boolean;
  showPresence?: boolean;
}) {
  const { t, href } = useI18n();
  // deleted accounts keep their place in history but have no profile to open
  const name = link && !user.username.startsWith("deleted-") ? (
    <Link href={href(`/profile/${user.username}`)} className="pchip-name truncate text-fg no-underline hover:underline">
      {user.displayName}
    </Link>
  ) : (
    <span className="pchip-name truncate">{user.displayName}</span>
  );
  return (
    <div className={cn("pchip", right && "right")}>
      <Avatar name={user.displayName} src={user.avatar} ring={ring} presence={showPresence ? user.presence : undefined} />
      <div className="min-w-0">
        {name}
        {meta !== undefined ? (
          <div className="pchip-meta">{meta}</div>
        ) : showPresence ? (
          <div className="pchip-meta row !gap-1.5">
            <PresenceDot presence={user.presence} inline />
            {t(`presence.${user.presence}`)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** MatchCard: result, opponent, score, when. */
export function MatchCard({ match }: { match: MatchSummary }) {
  const { t } = useI18n();
  const ago = useTimeAgo();
  const m = Math.floor(match.durationSeconds / 60);
  const s = match.durationSeconds % 60;
  return (
    <article className="match max-sm:!grid-cols-[auto_minmax(0,1fr)_auto]">
      <ResultBadge result={match.result} />
      <div className="min-w-0">
        <PlayerChip user={match.opponent.user} meta={match.tournament ? `${t("match.tournamentMatch")} · ${match.tournament.name}` : t("match.duration", { m, s })} ring="opp" showPresence={false} />
      </div>
      <div className="match-score" aria-label={`${match.you.score} – ${match.opponent.score}`}>
        <span className="c-magenta">{String(match.you.score).padStart(2, "0")}</span>
        <span className="subtle"> : </span>
        <span className="c-cyan">{String(match.opponent.score).padStart(2, "0")}</span>
      </div>
      <time className="match-when max-sm:hidden" dateTime={match.playedAt}>
        {ago(match.playedAt)}
      </time>
    </article>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="match" aria-hidden>
      <span className="skel" style={{ width: 56, height: 22 }} />
      <div className="row">
        <span className="skel skel-circle" />
        <span className="skel" style={{ width: 120 }} />
      </div>
      <span className="skel" style={{ width: 64, height: 24 }} />
      <span className="skel max-sm:hidden" style={{ width: 60 }} />
    </div>
  );
}

/** Pager: Previous / "Page x of y" / Next */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="row between mt-4" aria-label={t("common.page", { page, pages })}>
      <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t("common.previous")}
      </button>
      <span className="num num-sm muted">{t("common.page", { page, pages })}</span>
      <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t("common.next")}
      </button>
    </nav>
  );
}
