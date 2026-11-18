"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { GameConfig, GameState, PlayerInputs } from "shared";
import { GameEngine } from "shared/game-engine/GameEngine";
import { baseGameConfig } from "@/lib/game/config";
import { PongAi } from "@/lib/game/ai";
import { HitStop } from "@/lib/game/fx";
import { useI18n } from "@/i18n/I18nProvider";
import { useReducedMotion } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { Court } from "./court";

const POINTS = 5;
const COURT_X = 160;
const RESTART_MS = 2500;

/** The left bot reads a mirrored state: PongAi only knows how to play the right paddle. */
function mirror(s: GameState): GameState {
  return {
    ...s,
    ball: { ...s.ball, x: COURT_X - s.ball.x, vx: -s.ball.vx },
    paddles: [
      { ...s.paddles[1], x: COURT_X - s.paddles[1].x },
      { ...s.paddles[0], x: COURT_X - s.paddles[0].x },
    ],
    ...(s.paddleHeights ? { paddleHeights: [s.paddleHeights[1], s.paddleHeights[0]] } : {}),
    ...(s.powerUp ? { powerUp: { ...s.powerUp, x: COURT_X - s.powerUp.x } } : {}),
  } as GameState;
}

function newConfig(): GameConfig {
  return { ...baseGameConfig(), pointsToWin: POINTS, playerNames: ["P1", "CPU"], seed: Math.floor(Math.random() * 2 ** 31) };
}

/**
 * Landing-page "attract mode": two bots play on their own; W/S (or a press on the court)
 * takes over the left paddle for a quick match against the bot. Local only: nothing is sent
 * to the server, no account needed. Silent; reduced motion shows a still court + Play button.
 */
export function AttractCourt({ signedIn, playHref }: { signedIn: boolean; playHref: string }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [config, setConfig] = useState(newConfig);
  const [firstEngine] = useState(() => new GameEngine(structuredClone(config)));
  const engineRef = useRef(firstEngine);
  const leftBot = useRef(new PongAi("normal"));
  const rightBot = useRef(new PongAi("normal"));
  const human = useRef<PlayerInputs | null>(null);
  const state = useRef<GameState | null>(null);
  const [mode, setMode] = useState<"demo" | "playing" | "over">("demo");
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [started, setStarted] = useState(false);
  // reduced motion: nothing moves until the visitor asks for it
  const running = started || !reduced;

  const restart = useCallback((next: "demo" | "playing") => {
    const c = newConfig();
    engineRef.current = new GameEngine(structuredClone(c));
    leftBot.current = new PongAi("normal");
    rightBot.current = new PongAi("normal");
    state.current = null;
    human.current = null;
    setConfig(c);
    setScores([0, 0]);
    setMode(next);
  }, []);

  // Simulation loop; pauses while the tab is hidden (requestAnimationFrame stops by itself)
  useEffect(() => {
    if (!running || mode === "over") return;
    let raf = 0;
    let last = performance.now();
    let restartAt = 0;
    const hitStop = new HitStop();
    const step = (now: number) => {
      const engine = engineRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (hitStop.frozen(now)) {
        raf = requestAnimationFrame(step);
        return;
      }
      const s0 = engine.getGameState();
      // the mirrored bot's up/down are still up/down (only x is flipped)
      const left = mode === "playing" ? (human.current ?? undefined) : leftBot.current.decide(mirror(s0), now);
      engine.input(left, rightBot.current.decide(s0, now));
      engine.tick(dt);
      const s = engine.getGameState();
      state.current = s;
      hitStop.check(s, now);
      setScores((prev) => (prev[0] === s.scores[0] && prev[1] === s.scores[1] ? prev : [s.scores[0], s.scores[1]]));
      if (s.name === "GameOverState") {
        if (mode === "playing") {
          setMode("over");
          return;
        }
        // demo: a short pause, then a new rally
        restartAt ||= now + RESTART_MS;
        if (now >= restartAt) {
          restart("demo");
          return;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, mode, restart, config]);

  const getState = useCallback(() => state.current ?? engineRef.current.getGameState(), []);
  const onInputs = useCallback((p1: PlayerInputs) => {
    human.current = p1;
  }, []);
  // first key or press during the demo: a fresh match against the bot (Court reports a
  // first move only once, but the Play button and "again" call restart directly)
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const onFirstMove = useCallback(() => {
    setStarted(true);
    if (modeRef.current === "demo") restart("playing");
  }, [restart]);

  const playing = mode === "playing";
  const won = scores[0] > scores[1];
  return (
    <div className="attract relative w-full">
      <div className="attract-score" aria-live="polite">
        <span className={playing || mode === "over" ? "c-magenta" : undefined}>{playing || mode === "over" ? t("attract.you") : t("attract.cpu")}</span>
        <span className="num">
          {scores[0]} – {scores[1]}
        </span>
        <span className="c-cyan">{t("attract.cpu")}</span>
      </div>
      <div className="aspect-[16/10] w-full">
        <Court
          config={config}
          getState={getState}
          youSide={null}
          controls={mode === "over" ? "none" : "attract"}
          onInputs={onInputs}
          onFirstMove={onFirstMove}
          // the demo stays silent; sound starts once the visitor plays
          sound={mode !== "demo"}
        />
      </div>

      {mode === "demo" && running && (
        <p className="attract-hint t-caption">
          <span className="max-md:hidden">
            {t("attract.hintKeys")} <Kbd>W</Kbd> <Kbd>S</Kbd>
          </span>
          <span className="md:hidden">{t("attract.hintTouch")}</span>
        </p>
      )}
      {!running && (
        <div className="attract-overlay">
          <Button type="button" variant="primary" onClick={() => onFirstMove()}>
            <Play className="ico" aria-hidden />
            {t("attract.play")}
          </Button>
        </div>
      )}
      {mode === "over" && (
        <div className="attract-overlay" role="status">
          <p className="pix pix-md">{won ? t("attract.won") : t("attract.lost")}</p>
          <p className="muted">{signedIn ? t("attract.nextSignedIn") : t("attract.next")}</p>
          <div className="row wrap justify-center !gap-2">
            <Button asChild variant="primary">
              <Link href={playHref} className="no-underline">
                {signedIn ? t("landing.goToLobby") : t("attract.signup")}
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={() => restart("playing")}>
              <RotateCcw className="ico" aria-hidden />
              {t("attract.again")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
