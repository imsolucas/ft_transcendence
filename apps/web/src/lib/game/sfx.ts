/**
 * Arcade sound effects, synthesised with WebAudio (no audio files to download).
 * The AudioContext is created only inside a user gesture (unlockAudio from a key or pointer
 * handler), so the browser never warns about autoplay. Until then play() is a no-op.
 */
export type Sfx = "paddle" | "wall" | "score" | "power" | "win" | "lose";

let audio: AudioContext | null = null;

/** Call from a keydown / pointerdown handler. */
export function unlockAudio(): void {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch {
    audio = null;
  }
}

function tone(ctx: AudioContext, at: number, freq: number, to: number, dur: number, type: OscillatorType, volume = 0.05) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function playSfx(kind: Sfx): void {
  const ctx = audio;
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  switch (kind) {
    case "paddle":
      tone(ctx, t, 660, 660, 0.06, "square");
      break;
    case "wall":
      tone(ctx, t, 330, 330, 0.04, "square", 0.035);
      break;
    case "power":
      tone(ctx, t, 880, 1320, 0.12, "triangle");
      break;
    case "score":
      tone(ctx, t, 520, 200, 0.28, "sawtooth", 0.04);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, t + i * 0.09, f, f, 0.12, "square", 0.04));
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(ctx, t + i * 0.12, f, f * 0.97, 0.16, "triangle", 0.045));
      break;
  }
}
