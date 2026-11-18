"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clapperboard, Download, Share2, X } from "lucide-react";
import { toast } from "sonner";
import type { GameConfig, PaddleSkinId } from "shared";
import type { ReplayFrame } from "@/lib/game/fx";
import { PIXEL_H, PIXEL_W, drawFrame, readCourtColors } from "@/lib/game/renderer";
import { usePrefs, useReducedMotion } from "@/lib/prefs";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge } from "@/components/ui/primitives";
import { Button, IconButton } from "@/components/ui/button";
import { ClipInterrupted, clipMimeType, recordClip, type ClipCaption } from "@/lib/game/clip";

const SPEED = 0.35;
const PAUSE_MS = 900;

/**
 * Slow-motion replay of the deciding point on the end screen: loops the recorded frames at
 * SPEED. Purely visual (the match is already over; rematch/ready buttons stay usable), and
 * hidden with reduced motion.
 */
export function Replay({
  frames,
  config,
  youSide,
  skins,
  caption,
}: {
  frames: ReplayFrame[];
  config: GameConfig;
  youSide: 0 | 1 | null;
  skins?: readonly [PaddleSkinId, PaddleSkinId];
  /** names + final score for a shareable clip (no caption = no clip button) */
  caption?: ClipCaption;
}) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const { courtTheme, arcade } = usePrefs().prefs;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length < 2 || reduced || closed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const w = canvas.getBoundingClientRect().width;
      canvas.width = arcade ? PIXEL_W : Math.round(w * dpr);
      canvas.height = arcade ? PIXEL_H : Math.round((w / 16) * 10 * dpr);
      canvas.style.imageRendering = arcade ? "pixelated" : "";
    };
    fit();
    const colors = readCourtColors(canvas);
    // times are relative to the first kept frame (the recorder may have dropped older ones)
    const t0 = frames[0]!.t;
    const duration = frames[frames.length - 1]!.t - t0;
    let raf = 0;
    let start = performance.now();
    let i = 0;
    const loop = (now: number) => {
      const elapsed = (now - start) * SPEED;
      if (elapsed > duration + PAUSE_MS * SPEED) {
        start = now;
        i = 0;
      }
      while (i < frames.length - 1 && frames[i + 1]!.t - t0 <= elapsed) i++;
      drawFrame(ctx, frames[i]!.s, config, colors, { youSide, vertical: false, glow: true, skins, pixel: arcade });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frames, config, youSide, skins, reduced, closed, courtTheme, arcade]);

  if (frames.length < 2) return null;
  const clip = caption ? <ClipButton frames={frames} config={config} youSide={youSide} skins={skins} caption={caption} /> : null;
  // reduced motion or closed: no animation, but the clip (recorded off-screen) is still offered
  if (reduced || closed) return clip;
  return (
    <div className="stack w-full max-w-[420px] items-center !gap-2">
    <figure className="relative w-full">
      <canvas ref={canvasRef} data-court-theme={courtTheme} className="aspect-[16/10] w-full rounded-lg border border-[color:var(--court-border)]" role="img" aria-label={t("replay.label")} />
      <figcaption className="absolute left-2 top-2">
        <Badge tone="amber">{t("replay.badge")}</Badge>
      </figcaption>
      <IconButton size="sm" label={t("replay.skip")} className="absolute right-2 top-2" onClick={() => setClosed(true)}>
        <X className="ico" aria-hidden />
      </IconButton>
    </figure>
    {clip}
    </div>
  );
}

/**
 * Clip in two steps: record (about 15 s), then Share / Download. Each of those runs in its own
 * click, because phones only open the share sheet right after a tap.
 */
function ClipButton({ frames, config, youSide, skins, caption }: { frames: ReplayFrame[]; config: GameConfig; youSide: 0 | 1 | null; skins?: readonly [PaddleSkinId, PaddleSkinId]; caption: ClipCaption }) {
  const { t } = useI18n();
  const { courtTheme, arcade } = usePrefs().prefs;
  const [progress, setProgress] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const supported = useSyncExternalStore(noop, () => clipMimeType() !== null, () => false);
  useEffect(() => () => abortRef.current?.abort(), []);
  if (!supported) return null;

  const canShare = file !== null && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  async function record() {
    if (abortRef.current) return; // already recording (double click)
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setProgress(0);
    try {
      const { blob, extension } = await recordClip({ frames, config, youSide, skins, caption, courtTheme, pixel: arcade, onProgress: setProgress, signal: ctrl.signal });
      setFile(new File([blob], `volley-exe-clip-${new Date().toISOString().slice(0, 10)}.${extension}`, { type: blob.type }));
    } catch (err) {
      if (err instanceof ClipInterrupted) toast.error(t("clip.interrupted"));
      else if ((err as Error).name !== "AbortError") toast.error(t("clip.failed"));
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  function download(f: File) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.success(t("clip.saved"));
  }

  async function share(f: File) {
    try {
      await navigator.share({ files: [f], title: t("clip.shareTitle"), text: t("clip.shareText") });
    } catch (err) {
      // closing the share sheet is fine; anything else falls back to a download
      if ((err as Error).name !== "AbortError") download(f);
    }
  }

  // screen readers hear 0, 25, 50, 75 % (not every 1 %)
  const step = progress === null ? null : Math.floor(progress * 4) * 25;
  return (
    <div className="row wrap justify-center !gap-2">
      {file ? (
        <>
          {canShare && (
            <Button type="button" size="sm" variant="primary" onClick={() => share(file)}>
              <Share2 className="ico" aria-hidden />
              {t("clip.share")}
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" onClick={() => download(file)}>
            <Download className="ico" aria-hidden />
            {t("clip.download")}
          </Button>
        </>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={record} loading={progress !== null}>
          <Clapperboard className="ico" aria-hidden />
          {progress === null ? t("clip.save") : t("clip.recording", { n: Math.round(progress * 100) })}
        </Button>
      )}
      <span className="sr-only" role="status">
        {file ? t("clip.ready") : step !== null ? t("clip.recording", { n: step }) : ""}
      </span>
    </div>
  );
}

const noop = () => () => {};
