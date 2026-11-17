"use client";

import { Award, Crown, Flame, Gamepad2, Medal, ShieldCheck, Trophy, Users, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Achievement, AchievementId } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/primitives";

const ICONS: Record<AchievementId, LucideIcon> = {
  first_win: Medal,
  ten_wins: Award,
  fifty_wins: Trophy,
  regular: Gamepad2,
  streak_5: Flame,
  shutout: ShieldCheck,
  champion: Crown,
  social: Users,
};

/** Achievement grid: unlocked ones are lit (icon + "Unlocked"), locked ones show progress. */
export function Achievements({ items }: { items: Achievement[] }) {
  const { t } = useI18n();
  const unlocked = items.filter((a) => a.unlocked).length;
  return (
    <Panel>
      <p className="t-label muted mb-4">{t("achievements.count", { n: unlocked, total: items.length })}</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((a) => {
          const Icon = ICONS[a.id];
          return (
            <li
              key={a.id}
              className={cn("panel panel-2 stack stack-2 !p-4", !a.unlocked && "opacity-75")}
              aria-label={`${t(`achievements.${a.id}.title`)}: ${a.unlocked ? t("achievements.unlocked") : `${a.progress} / ${a.target}`}`}
            >
              <div className="row between">
                <Icon className={cn("ico !h-6 !w-6", a.unlocked ? "c-amber" : "subtle")} aria-hidden />
                <span className={cn("t-caption", a.unlocked ? "c-green" : "subtle")}>
                  {a.unlocked ? t("achievements.unlocked") : `${a.progress} / ${a.target}`}
                </span>
              </div>
              <h3 className="t-strong">{t(`achievements.${a.id}.title`)}</h3>
              <p className="t-caption muted">{t(`achievements.${a.id}.body`)}</p>
              {!a.unlocked && (
                <div className="meter" aria-hidden>
                  <i style={{ width: `${(100 * a.progress) / a.target}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
