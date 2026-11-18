"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Lock, Shuffle, Undo2 } from "lucide-react";
import {
  AVATAR_PARTS,
  AVATAR_SLOTS,
  FRAMES,
  PADDLES,
  isUnlocked,
  type AvatarSlot,
  type FrameId,
  type PaddleSkinId,
  type PlayerLook,
  type Progress,
  type Unlock,
} from "shared";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError, api, fetcher } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { MyLook } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar, Panel, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PixelAvatar } from "@/components/ui/pixel-avatar";
import { LoadError } from "./settings-ui";

/**
 * Pixel avatar builder, frame and paddle skin. Locked options show how to unlock them;
 * the server checks unlocks again on save.
 */
export function AvatarSection() {
  const { t } = useI18n();
  const { me, mutate: mutateMe } = useMe();
  const { data, error, mutate } = useSWR<MyLook>("/api/me/look", fetcher, { revalidateOnFocus: false });
  const [draft, setDraft] = useState<PlayerLook | null>(null);
  const [saving, setSaving] = useState(false);

  if (error && !data) {
    return (
      <Panel title={t("look.title")}>
        <LoadError onRetry={() => mutate()} />
      </Panel>
    );
  }
  if (!data || !me) {
    return (
      <Panel title={t("look.title")}>
        <Skeleton className="!h-64 w-full" />
      </Panel>
    );
  }

  const look = draft ?? data.look;
  // stored unlocks only: what the server will accept
  const progress: Progress = { level: data.level, achievements: [] };
  const open = (key: string, unlock: Unlock) => !unlock || isUnlocked(unlock, progress) || data.unlocked.includes(key);
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(data.look);

  const lockText = (unlock: Unlock) =>
    !unlock ? "" : "level" in unlock ? t("look.unlockLevel", { n: unlock.level }) : t("look.unlockAchievement", { name: t(`achievements.${unlock.achievement}.title`) });

  /** shapes have names; colours are numbered within their slot ("Shirt 2") */
  const COLOUR_SLOTS: AvatarSlot[] = ["hairColor", "shirt", "bg"];
  const partName = (slot: AvatarSlot, id: string, i: number) =>
    COLOUR_SLOTS.includes(slot) ? t("look.part.colour", { slot: t(`look.slot.${slot}`), n: i + 1 }) : t(`look.part.${slot}.${id}`);

  function setSlot(slot: AvatarSlot, value: number) {
    setDraft({ ...look, pixel: { ...look.pixel, [slot]: value } });
  }

  function randomize() {
    const pixel = { ...look.pixel };
    for (const slot of AVATAR_SLOTS) {
      const choices = AVATAR_PARTS[slot].map((o, i) => (open(`${slot}:${o.id}`, o.unlock) ? i : -1)).filter((i) => i >= 0);
      pixel[slot] = choices[Math.floor(Math.random() * choices.length)] ?? 0;
    }
    setDraft({ ...look, pixel });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api.put<MyLook>("/api/me/look", { look });
      await mutate(res, { revalidate: false });
      setDraft(null);
      void mutateMe();
      toast.success(t("look.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError && err.code === "LOCKED" ? t("look.errLocked") : err instanceof ApiError && err.status === 0 ? t("common.networkError") : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={t("look.title")}>
      <p className="muted mb-4">{t("look.body")}</p>
      <div className="flex flex-wrap items-center gap-6">
        <Avatar name={me.displayName} look={look} size="xl" className="!h-32 !w-32" />
        <div className="stack !gap-2">
          <span className="t-caption subtle">{t("look.level", { n: data.level })}</span>
          <div className="row wrap !gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={randomize}>
              <Shuffle className="ico" aria-hidden />
              {t("look.randomize")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={!dirty}>
              <Undo2 className="ico" aria-hidden />
              {t("look.reset")}
            </Button>
          </div>
        </div>
      </div>
      {me.avatar && <p className="t-caption subtle mt-3">{t("look.photoNote")}</p>}

      <div className="stack mt-6 !gap-5">
        {AVATAR_SLOTS.map((slot) => (
          <OptionRow key={slot} label={t(`look.slot.${slot}`)} name={`look-${slot}`}>
            {AVATAR_PARTS[slot].map((opt, i) => {
              const unlocked = open(`${slot}:${opt.id}`, opt.unlock);
              return (
                <Choice
                  key={opt.id}
                  name={`look-${slot}`}
                  checked={look.pixel[slot] === i}
                  disabled={!unlocked}
                  label={unlocked ? partName(slot, opt.id, i) : `${partName(slot, opt.id, i)} · ${lockText(opt.unlock)}`}
                  onSelect={() => setSlot(slot, i)}
                >
                  <PixelAvatar spec={{ ...look.pixel, [slot]: i }} className="h-full w-full rounded-sm" />
                </Choice>
              );
            })}
          </OptionRow>
        ))}

        <OptionRow label={t("look.frame")} name="look-frame">
          {FRAMES.map((f) => {
            const unlocked = open(`frame:${f.id}`, f.unlock);
            const label = t(`look.frames.${f.id}`);
            return (
              <Choice
                key={f.id}
                name="look-frame"
                wide
                checked={look.frame === f.id}
                disabled={!unlocked}
                label={unlocked ? label : `${label} · ${lockText(f.unlock)}`}
                onSelect={() => setDraft({ ...look, frame: f.id as FrameId })}
              >
                <span className="row !gap-2">
                  <Avatar name={me.displayName} look={{ ...look, frame: f.id }} size="sm" />
                  <span className="t-caption">{label}</span>
                </span>
              </Choice>
            );
          })}
        </OptionRow>

        <OptionRow label={t("look.paddle")} name="look-paddle">
          {PADDLES.map((k) => {
            const unlocked = open(`paddle:${k.id}`, k.unlock);
            const label = t(`look.paddles.${k.id}`);
            return (
              <Choice
                key={k.id}
                name="look-paddle"
                wide
                checked={look.paddle === k.id}
                disabled={!unlocked}
                label={unlocked ? label : `${label} · ${lockText(k.unlock)}`}
                onSelect={() => setDraft({ ...look, paddle: k.id as PaddleSkinId })}
              >
                <span className="row !gap-2">
                  <span aria-hidden className={cn("paddle-swatch", `skin-${k.id}`)} />
                  <span className="t-caption">{label}</span>
                </span>
              </Choice>
            );
          })}
        </OptionRow>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="primary" onClick={save} disabled={!dirty || saving} loading={saving}>
          {t("look.save")}
        </Button>
      </div>
    </Panel>
  );
}

function OptionRow({ label, children }: { label: string; name: string; children: React.ReactNode }) {
  return (
    <fieldset className="stack !gap-2">
      <legend className="t-label mb-2">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** A native radio (keyboard arrows work) drawn as a tile; locked = disabled with a lock badge. */
function Choice({
  name,
  checked,
  disabled,
  label,
  onSelect,
  wide,
  children,
}: {
  name: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  onSelect: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("look-choice", wide && "look-choice-wide", checked && "is-checked", disabled && "is-locked")} title={label}>
      <input type="radio" name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onSelect} aria-label={label} />
      {children}
      {disabled && (
        <span className="look-lock" aria-hidden>
          <Lock className="ico" />
        </span>
      )}
    </label>
  );
}
