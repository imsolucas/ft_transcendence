import type { GameConfig, PaddleSkinId } from "shared";
import type { ReplayFrame } from "./fx";
import { PIXEL_H, PIXEL_W, drawFrame, readCourtColors } from "./renderer";

/**
 * Shareable clips: the deciding point re-drawn on a hidden canvas and recorded with
 * MediaRecorder (MP4 where the browser can, else WebM). Everything happens in the browser;
 * nothing is uploaded. The canvas is off-screen, so this also works with reduced motion.
 */

const WIDTH = 1280;
const HEIGHT = 800;
const FPS = 30;
/** the clip shows the end of the point, slowed down */
const CLIP_SECONDS = 8;
const SPEED = 0.5;
const END_CARD_MS = 1500;

const MIME_TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

/** The best format this browser can record, or null (then clips aren't offered). */
export function clipMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export interface ClipCaption {
  left: string;
  right: string;
  scores: [number, number];
}

export interface ClipOptions {
  frames: ReplayFrame[];
  config: GameConfig;
  youSide: 0 | 1 | null;
  skins?: readonly [PaddleSkinId, PaddleSkinId];
  caption: ClipCaption;
  /** the player's court theme (data-court-theme), so the clip looks like their game */
  courtTheme: string;
  /** arcade display: the court is drawn low-res and scaled up with hard pixel edges */
  pixel?: boolean;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Thrown when the tab was hidden mid-recording (browsers stop drawing hidden tabs). */
export class ClipInterrupted extends Error {
  constructor() {
    super("clip interrupted");
    this.name = "ClipInterrupted";
  }
}

export async function recordClip(opts: ClipOptions): Promise<{ blob: Blob; extension: "mp4" | "webm" }> {
  const mime = clipMimeType();
  if (!mime) throw new Error("clips unsupported");
  if (opts.frames.length < 2) throw new Error("nothing to record");
  opts.signal?.throwIfAborted();

  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-display").trim() || "monospace";
  const mono = css.getPropertyValue("--font-mono").trim() || "monospace";
  // canvas text uses whatever is loaded right now: load the two faces first
  await Promise.all([document.fonts.load(`20px ${display}`), document.fonts.load(`600 22px ${mono}`)]).catch(() => {});

  const all = opts.frames;
  const tEnd = all[all.length - 1]!.t;
  const frames = all.filter((f) => f.t >= tEnd - CLIP_SECONDS * 1000);
  const t0 = frames[0]!.t;
  const playMs = (tEnd - t0) / SPEED;
  const totalMs = playMs + END_CARD_MS;

  // off-screen but attached (some browsers only capture canvases in the document)
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.courtTheme = opts.courtTheme;
  canvas.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;pointer-events:none";
  document.body.appendChild(canvas);

  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let onAbort: (() => void) | null = null;
  let onHidden: (() => void) | null = null;
  const cleanup = () => {
    if (timer !== null) clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
    canvas.remove();
    if (onAbort) opts.signal?.removeEventListener("abort", onAbort);
    if (onHidden) document.removeEventListener("visibilitychange", onHidden);
  };

  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    const colors = readCourtColors(canvas);
    // arcade display: draw the court into a small buffer, then blow it up without smoothing
    const low = opts.pixel ? document.createElement("canvas") : null;
    const lowCtx = low?.getContext("2d") ?? null;
    if (low) {
      low.width = PIXEL_W;
      low.height = PIXEL_H;
    }
    stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const scoreLine = () => `${opts.caption.left}  ${opts.caption.scores[0]} – ${opts.caption.scores[1]}  ${opts.caption.right}`;
    const draw = (elapsed: number, i: number) => {
      if (elapsed < playMs) {
        if (low && lowCtx) {
          drawFrame(lowCtx, frames[i]!.s, opts.config, colors, { youSide: opts.youSide, vertical: false, glow: true, skins: opts.skins, pixel: true });
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(low, 0, 0, WIDTH, HEIGHT);
        } else {
          drawFrame(ctx, frames[i]!.s, opts.config, colors, { youSide: opts.youSide, vertical: false, glow: true, skins: opts.skins });
        }
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, HEIGHT - 72, WIDTH, 72);
        ctx.textBaseline = "middle";
        ctx.font = `20px ${display}`;
        ctx.fillStyle = colors.you;
        ctx.textAlign = "left";
        ctx.fillText("VOLLEY.EXE", 28, HEIGHT - 36);
        ctx.font = `600 22px ${mono}`;
        ctx.fillStyle = colors.ball;
        ctx.textAlign = "right";
        ctx.fillText(scoreLine(), WIDTH - 28, HEIGHT - 36);
      } else {
        // end card: the final score, big
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `48px ${display}`;
        ctx.fillStyle = colors.you;
        ctx.fillText("VOLLEY.EXE", WIDTH / 2, HEIGHT / 2 - 70);
        ctx.font = `600 40px ${mono}`;
        ctx.fillStyle = colors.ball;
        ctx.fillText(scoreLine(), WIDTH / 2, HEIGHT / 2 + 20);
      }
    };

    return await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            /* already stopping */
          }
        }
        cleanup();
        reject(err);
      };
      onAbort = () => fail(new DOMException("aborted", "AbortError"));
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      // hidden tabs stop drawing (the clip would freeze): stop and say so
      onHidden = () => {
        if (document.visibilityState === "hidden") fail(new ClipInterrupted());
      };
      document.addEventListener("visibilitychange", onHidden);
      recorder.onerror = (e) => fail((e as Event & { error?: unknown }).error ?? new Error("recorder error"));
      recorder.onstop = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ blob: new Blob(chunks, { type: mime.split(";")[0] }), extension: mime.includes("mp4") ? "mp4" : "webm" });
      };

      let i = 0;
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        opts.onProgress?.(Math.min(1, elapsed / totalMs));
        while (i < frames.length - 1 && frames[i + 1]!.t - t0 <= elapsed * SPEED) i++;
        try {
          draw(elapsed, i);
        } catch (err) {
          fail(err);
          return;
        }
        if (elapsed >= totalMs && recorder.state === "recording") {
          if (timer !== null) clearInterval(timer);
          timer = null;
          recorder.stop();
        }
      };
      try {
        draw(0, 0);
        recorder.start(250);
        // a timer, not requestAnimationFrame: the canvas is off-screen
        timer = setInterval(tick, 1000 / FPS);
      } catch (err) {
        fail(err);
      }
    });
  } catch (err) {
    cleanup();
    throw err;
  }
}
