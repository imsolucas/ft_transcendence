"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu as MenuIcon, WifiOff } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/prefs";
import { Avatar, Badge, Kbd, Modal, Spinner } from "@/components/ui/primitives";
import { Button, IconButton } from "@/components/ui/button";
import { Horizon } from "@/components/layout/crt";

export interface Side {
  name: string;
  avatar?: string | null;
  meta?: string;
}

/** In-game top bar: you magenta left, opponent cyan right, score in the display face, amber timer. */
export function ScoreBoard({
  left,
  right,
  scores,
  seconds,
  leftIsYou = true,
  mode,
  connection,
  onMenu,
}: {
  left: Side;
  right: Side;
  scores: [number, number];
  seconds: number;
  leftIsYou?: boolean;
  mode?: ReactNode;
  connection?: ReactNode;
  onMenu?: () => void;
}) {
  const { t } = useI18n();
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="scoreboard !grid-cols-[1fr_auto_1fr] max-sm:!gap-2 max-sm:!px-3">
      <div className="pchip min-w-0">
        <Avatar name={left.name} src={left.avatar} ring={leftIsYou ? "you" : undefined} size="md" className="max-sm:!h-7 max-sm:!w-7" />
        <div className="min-w-0">
          <div className="pchip-name truncate">{left.name}</div>
          {left.meta && <div className="pchip-meta max-sm:hidden">{left.meta}</div>}
        </div>
      </div>
      <div className="sb-mid">
        <div className="sb-score max-sm:!text-[20px] max-sm:!leading-[28px]" aria-live="polite" aria-label={`${scores[0]} – ${scores[1]}`}>
          <span className={cn(leftIsYou ? "c-magenta glow-text-magenta" : "c-cyan")}>{scores[0]}</span>
          <span className="sep">:</span>
          <span className={cn(leftIsYou ? "c-cyan" : "c-magenta glow-text-magenta")}>{scores[1]}</span>
        </div>
        <div className="sb-timer">
          {mm}:{ss}
        </div>
      </div>
      <div className="pchip right min-w-0">
        <Avatar name={right.name} src={right.avatar} ring="opp" size="md" className="max-sm:!h-7 max-sm:!w-7" />
        <div className="min-w-0">
          <div className="pchip-name truncate">{right.name}</div>
          {right.meta && <div className="pchip-meta max-sm:hidden">{right.meta}</div>}
        </div>
      </div>
      {(mode || connection || onMenu) && (
        <div className="col-span-3 row between border-t border-border pt-2 max-sm:pt-1">
          <span className="t-caption subtle">{mode}</span>
          <div className="row">
            {connection}
            {onMenu && (
              <IconButton label={t("game.menu")} onClick={onMenu} size="sm">
                <MenuIcon className="ico" aria-hidden />
              </IconButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Connection quality: bars + ms, three levels that also differ by bar count. */
export function ConnectionQuality({ ms, offline }: { ms?: number; offline?: boolean }) {
  const { t } = useI18n();
  if (offline) {
    return (
      <span className="conn poor">
        <WifiOff className="ico !h-4 !w-4 c-red" aria-hidden />
        <span>{t("presence.OFFLINE")}</span>
      </span>
    );
  }
  if (ms === undefined) return null;
  const level = ms < 80 ? "good" : ms < 200 ? "fair" : "poor";
  return (
    <span className={cn("conn", level)} aria-label={t("game.connection", { level: t(`game.connLevel.${level}`), ms })}>
      <span className="conn-bars" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      {ms} ms
    </span>
  );
}

/** 3-2-1 over the court; digits swap without scaling under reduced motion. */
export function CountdownOverlay({ from = 3, onDone }: { from?: number; onDone: () => void }) {
  const [n, setN] = useState(from);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (n <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setN((v) => v - 1), 800);
    return () => clearTimeout(id);
  }, [n, onDone]);
  if (n <= 0) return null;
  return (
    <div className="overlay" role="status" aria-live="assertive">
      <span key={n} className={cn("countdown-num glow-text-amber", !reduced && "animate-[power-on_300ms_ease-out]")}>
        {n}
      </span>
    </div>
  );
}

/** Shown over the court on first play until the first paddle move. */
export function ControlsCard({ local, onClose }: { local: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="overlay !bg-transparent pointer-events-none">
      <div className="panel panel-3 pointer-events-auto max-w-[420px] text-left">
        <h2 className="t-heading mb-1">{t("game.controlsTitle")}</h2>
        <p className="muted mb-4">{t("game.controlsBody")}</p>
        <div className="stack stack-3">
          <div className="row between">
            <span className="t-label">{local ? t("game.player1Keys") : t("common.you")}</span>
            <span className="row">
              <Kbd>W</Kbd>
              <Kbd>S</Kbd>
              {!local && (
                <>
                  <span className="subtle">/</span>
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </>
              )}
            </span>
          </div>
          {local && (
            <div className="row between">
              <span className="t-label">{t("game.player2Keys")}</span>
              <span className="row">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </span>
            </div>
          )}
        </div>
        <Button className="mt-4" size="sm" onClick={onClose}>
          {t("game.gotIt")}
        </Button>
      </div>
    </div>
  );
}

/** Esc menu: Resume, controls, forfeit (confirmed). */
export function GameMenu({
  open,
  onOpenChange,
  online,
  onShowControls,
  onForfeit,
  forfeitLabel,
  confirmTitle,
  confirmBody,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  online: boolean;
  onShowControls: () => void;
  onForfeit: () => void;
  /** e.g. "Leave tournament" for someone who is only watching */
  forfeitLabel?: string;
  confirmTitle?: string;
  confirmBody?: string;
}) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Modal
        open={open && !confirm}
        onOpenChange={onOpenChange}
        title={t("game.menu")}
        description={online ? t("game.onlineKeepsRunning") : undefined}
        ownEscape
      >
        <div className="stack stack-3 mt-4">
          <Button variant="primary" glow="sm" block onClick={() => onOpenChange(false)}>
            {t("game.resume")}
          </Button>
          <Button block onClick={onShowControls}>
            {t("game.controlsTitle")}
          </Button>
          <Button variant="danger" block onClick={() => setConfirm(true)}>
            {forfeitLabel ?? t("game.forfeit")}
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title={confirmTitle ?? t("game.forfeitConfirmTitle")}
        description={confirmBody ?? t("game.forfeitConfirmBody")}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirm(false);
                onOpenChange(false);
                onForfeit();
              }}
            >
              {forfeitLabel ?? t("game.forfeit")}
            </Button>
          </>
        }
      />
    </>
  );
}

/** "Reconnecting…" over the court for your own dropped connection. */
export function ReconnectingOverlay({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="overlay">
      <div className="reconnect" role="status" aria-live="assertive">
        <Spinner large />
        <p className="t-heading">{t("game.reconnecting")}</p>
        <Button size="sm" onClick={onRetry}>
          {t("game.retryNow")}
        </Button>
      </div>
    </div>
  );
}

/** Match end: horizon returns; result + final score; primary action + back to lobby. */
export function MatchEnd({
  won,
  title,
  scores,
  leftName,
  rightName,
  primary,
  secondary,
  note,
}: {
  won: boolean | null;
  title: string;
  scores: [number, number];
  leftName: string;
  rightName: string;
  primary: ReactNode;
  secondary: ReactNode;
  note?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="relative flex min-h-[70dvh] flex-col items-center justify-center gap-6 overflow-hidden px-4 pb-48 pt-10 text-center">
      <Horizon />
      <div className="relative z-10 flex flex-col items-center gap-5">
        {won !== null && (
          <Badge tone={won ? "green" : "red"}>{won ? t("match.win") : t("match.loss")}</Badge>
        )}
        <h1 className={cn("pix pix-lg", won === false ? "c-red" : "c-magenta glow-text-magenta")}>{title}</h1>
        <div className="stack items-center">
          <p className="t-label subtle">{t("game.finalScore")}</p>
          <p className="pix pix-score" aria-label={`${leftName} ${scores[0]}, ${rightName} ${scores[1]}`}>
            <span className="c-magenta">{scores[0]}</span>
            <span className="subtle"> : </span>
            <span className="c-cyan">{scores[1]}</span>
          </p>
          <p className="muted">
            {leftName} · {rightName}
          </p>
        </div>
        {won === false && <p className="pix pix-sm c-amber">{t("game.insertCoinContinue")}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {primary}
          {secondary}
        </div>
        {note}
      </div>
    </div>
  );
}
