"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { GameConfig, GameState, PlayerInputs } from "shared";
import { GameEngine } from "shared/game-engine/GameEngine";
import { baseGameConfig } from "@/lib/game/config";
import { PongAi, type AiLevel } from "@/lib/game/ai";
import { HitStop, type ReplayFrame } from "@/lib/game/fx";
import { CourtThemePicker } from "@/components/game/court-theme-picker";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useReturnTo } from "@/lib/return-to";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { Kbd, Panel, Segmented } from "@/components/ui/primitives";
import { Court } from "@/components/game/court";
import { Replay } from "@/components/game/replay";
import { ControlsCard, CountdownOverlay, GameMenu, MatchEnd, ScoreBoard } from "@/components/game/hud";

type Speed = "slow" | "normal" | "fast";
const BALL: Record<Speed, number> = { slow: 35, normal: 50, fast: 70 };
const PADDLE: Record<Speed, number> = { slow: 35, normal: 47, fast: 65 };
const POINTS = [5, 7, 11] as const;
const DEFAULTS = { ball: "normal" as Speed, paddle: "normal" as Speed, points: 11, powerUps: false };

interface Setup {
  p1: string;
  p2: string;
  /** vs AI: player 2 is the computer at this level */
  ai?: AiLevel;
  ball: Speed;
  paddle: Speed;
  points: number;
  /** grow / shrink / fast items on the court */
  powerUps: boolean;
}

function buildConfig(s: Setup): GameConfig {
  const base = baseGameConfig();
  return {
    ...base,
    playerNames: [s.p1.trim(), s.p2.trim()],
    pointsToWin: s.points,
    powerUps: s.powerUps,
    // a fresh seed per game, so items don't appear in the same places every time
    seed: Math.floor(Math.random() * 2 ** 31),
    ballConfig: { ...base.ballConfig, speed: BALL[s.ball] },
    paddleConfig: { ...base.paddleConfig, speed: PADDLE[s.paddle] },
  };
}

export function LocalGame() {
  const vsAi = useSearchParams().get("mode") === "ai";
  const [setup, setSetup] = useState<Setup | null>(null);
  const [round, setRound] = useState(0);
  if (!setup) return <SetupForm key={vsAi ? "ai" : "local"} vsAi={vsAi} onStart={setSetup} />;
  return <LocalMatch key={round} setup={setup} onPlayAgain={() => setRound((r) => r + 1)} onChangeSetup={() => setSetup(null)} />;
}

function SetupForm({ onStart, vsAi }: { onStart: (s: Setup) => void; vsAi: boolean }) {
  const { t } = useI18n();
  const backHref = useBackHref();
  const { setPref } = usePrefs();
  const [s, setS] = useState<Setup>({
    ...DEFAULTS,
    p1: t("local.defaultP1"),
    p2: vsAi ? t("local.computer") : t("local.defaultP2"),
    ...(vsAi ? { ai: "normal" as AiLevel } : {}),
  });
  const errors = {
    p1: !s.p1.trim() || s.p1.trim().length > 16 ? t("local.nameRequired") : undefined,
    p2: !s.p2.trim() || s.p2.trim().length > 16 ? t("local.nameRequired") : s.p1.trim().toLowerCase() === s.p2.trim().toLowerCase() ? t("local.namesDiffer") : undefined,
  };
  const valid = !errors.p1 && !errors.p2;
  const speedOptions = (["slow", "normal", "fast"] as const).map((v) => ({ value: v, label: t(`local.${v}`) }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) onStart(s);
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8">
      <Link href={backHref} className="row t-label mb-4 no-underline text-fg-muted">
        <ArrowLeft className="ico" aria-hidden /> {t("common.back")}
      </Link>
      <h1 className="pix pix-md mb-1">{vsAi ? t("local.aiTitle") : t("local.title")}</h1>
      <p className="muted mb-6">{vsAi ? t("local.aiSubtitle") : t("local.subtitle")}</p>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_340px]" noValidate>
        <div className="stack stack-5">
          <Panel>
            <div className="grid gap-5 sm:grid-cols-2">
              {(vsAi ? (["p1"] as const) : (["p1", "p2"] as const)).map((k, i) => (
                <div key={k} className="stack">
                  <FormField label={t(i === 0 ? "local.player1" : "local.player2")} error={errors[k]}>
                    {({ id, describedBy, invalid }) => (
                      <Input id={id} aria-describedby={describedBy} invalid={invalid} maxLength={16} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
                    )}
                  </FormField>
                  <div className="row">
                    {i === 0 && vsAi ? (
                      <>
                        <Kbd>W</Kbd>
                        <Kbd>S</Kbd>
                        <span className="subtle">/</span>
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd>
                      </>
                    ) : i === 0 ? (
                      <>
                        <Kbd>W</Kbd>
                        <Kbd>S</Kbd>
                      </>
                    ) : (
                      <>
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="stack stack-5">
              {vsAi && (
                <Row label={t("local.difficulty")} hint={t("local.default", { value: t("local.normal") })}>
                  <Segmented
                    label={t("local.difficulty")}
                    value={s.ai ?? "normal"}
                    onChange={(v) => setS({ ...s, ai: v })}
                    options={(["easy", "normal", "hard"] as const).map((v) => ({ value: v, label: t(`local.${v}`) }))}
                  />
                </Row>
              )}
              <Row label={t("game.courtTheme")} hint={t("local.default", { value: t("game.theme.neon") })}>
                <CourtThemePicker />
              </Row>
              <Row label={t("local.ballSpeed")} hint={t("local.default", { value: t("local.normal") })}>
                <Segmented label={t("local.ballSpeed")} value={s.ball} onChange={(v) => setS({ ...s, ball: v })} options={speedOptions} />
              </Row>
              <Row label={t("local.paddleSpeed")} hint={t("local.default", { value: t("local.normal") })}>
                <Segmented label={t("local.paddleSpeed")} value={s.paddle} onChange={(v) => setS({ ...s, paddle: v })} options={speedOptions} />
              </Row>
              <Row label={t("local.powerUps")} hint={t("local.powerUpsHint")}>
                <Segmented
                  label={t("local.powerUps")}
                  value={s.powerUps ? "on" : "off"}
                  onChange={(v) => setS({ ...s, powerUps: v === "on" })}
                  options={[
                    { value: "off", label: t("local.off") },
                    { value: "on", label: t("local.on") },
                  ]}
                />
              </Row>
              <Row label={t("local.pointsToWin")} hint={t("local.default", { value: 11 })}>
                <Segmented label={t("local.pointsToWin")} value={s.points} onChange={(v) => setS({ ...s, points: v })} options={POINTS.map((p) => ({ value: p, label: String(p) }))} />
              </Row>
            </div>
          </Panel>
        </div>
        <Panel className="h-fit lg:sticky lg:top-6" title={t("local.summary")}>
          <dl className="stack stack-3 mb-5">
            <SummaryRow k={t("local.player1")} v={s.p1 || "—"} />
            {s.ai ? <SummaryRow k={t("local.difficulty")} v={t(`local.${s.ai}`)} /> : <SummaryRow k={t("local.player2")} v={s.p2 || "—"} />}
            <SummaryRow k={t("local.ballSpeed")} v={t(`local.${s.ball}`)} />
            <SummaryRow k={t("local.paddleSpeed")} v={t(`local.${s.paddle}`)} />
            <SummaryRow k={t("local.pointsToWin")} v={String(s.points)} />
            <SummaryRow k={t("local.powerUps")} v={s.powerUps ? t("local.on") : t("local.off")} />
          </dl>
          <div className="stack stack-3">
            <Button type="submit" variant="primary" glow="sm" block disabled={!valid}>
              {t("local.start")}
            </Button>
            {!valid && <p className="field-hint">{errors.p1 ?? errors.p2}</p>}
            <Button type="button" variant="ghost" block onClick={() => {
                setS({ ...s, ball: DEFAULTS.ball, paddle: DEFAULTS.paddle, points: DEFAULTS.points, powerUps: DEFAULTS.powerUps, ...(vsAi ? { ai: "normal" as AiLevel } : {}) });
                setPref("courtTheme", "neon");
              }}>
              <RotateCcw className="ico" aria-hidden />
              {t("local.reset")}
            </Button>
          </div>
        </Panel>
      </form>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="t-strong">{label}</p>
        <p className="t-caption subtle">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="row between">
      <dt className="muted">{k}</dt>
      <dd className="t-strong truncate">{v}</dd>
    </div>
  );
}

function LocalMatch({ setup, onPlayAgain, onChangeSetup }: { setup: Setup; onPlayAgain: () => void; onChangeSetup: () => void }) {
  const { t } = useI18n();
  const backHref = useBackHref();
  const { prefs, setPref } = usePrefs();
  const [config] = useState(() => buildConfig(setup));
  const [engine] = useState(() => new GameEngine(structuredClone(config)));
  const [ai] = useState(() => (setup.ai ? new PongAi(setup.ai) : null));
  const p1Inputs = useRef<PlayerInputs | null>(null);
  const state = useRef<GameState | null>(null);
  const [phase, setPhase] = useState<"countdown" | "playing" | "over">("countdown");
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [seconds, setSeconds] = useState(0);
  const [menu, setMenu] = useState(false);
  const [showControls, setShowControls] = useState(!prefs.seenControls);
  const [lastPoint, setLastPoint] = useState<ReplayFrame[]>([]);

  // Simulation loop (paused while the menu is open)
  useEffect(() => {
    if (phase !== "playing" || menu) return;
    let raf = 0;
    let last = performance.now();
    const hitStop = new HitStop();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // a paddle hit freezes the simulation for a few frames (the court keeps drawing)
      if (hitStop.frozen(now)) {
        raf = requestAnimationFrame(step);
        return;
      }
      if (ai) engine.input(p1Inputs.current ?? undefined, ai.decide(engine.getGameState(), now));
      engine.tick(dt);
      const s = engine.getGameState();
      hitStop.check(s, now);
      state.current = s;
      setScores((prev) => (prev[0] === s.scores[0] && prev[1] === s.scores[1] ? prev : [s.scores[0], s.scores[1]]));
      if (s.name === "GameOverState") {
        setPhase("over");
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, menu, engine, ai]);

  useEffect(() => {
    if (phase !== "playing" || menu) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase, menu]);

  useEffect(() => {
    // Esc toggles the menu (the menu dialog leaves Esc to us)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "playing") setMenu((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const getState = useCallback(() => state.current ?? engine.getGameState(), [engine]);
  const onInputs = useCallback(
    (p1: PlayerInputs, p2: PlayerInputs) => {
      if (ai) p1Inputs.current = p1; // the AI owns paddle 2; read every frame
      else engine.input(p1, p2);
    },
    [engine, ai]
  );
  const onFirstMove = useCallback(() => {
    setShowControls(false);
    setPref("seenControls", true);
  }, [setPref]);
  const startPlaying = useCallback(() => setPhase("playing"), []);

  if (phase === "over") {
    const p1Won = scores[0] > scores[1];
    return (
      <MatchEnd
        won={null}
        title={t("game.winner", { name: p1Won ? setup.p1 : setup.p2 })}
        scores={scores}
        replay={<Replay frames={lastPoint} config={config} youSide={null} caption={{ left: setup.p1, right: setup.p2, scores }} />}
        leftName={setup.p1}
        rightName={setup.p2}
        primary={
          <Button variant="primary" glow="md" size="lg" onClick={onPlayAgain}>
            {t("game.playAgain")}
          </Button>
        }
        secondary={
          <Button size="lg" onClick={onChangeSetup}>
            {t("local.title").charAt(0) + t("local.title").slice(1).toLowerCase()}
          </Button>
        }
        note={
          <Link href={backHref} className="t-label">
            {t("common.back")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <ScoreBoard
        left={{ name: setup.p1, meta: "W / S" }}
        right={{ name: setup.p2, meta: setup.ai ? t(`local.${setup.ai}`) : "↑ / ↓" }}
        scores={scores}
        seconds={seconds}
        mode={setup.ai ? `${t("lobby.vsAi")} · ${t("game.first", { n: setup.points })}` : t("game.first", { n: setup.points })}
        onMenu={() => setMenu(true)}
      />
      <div className="relative flex-1 p-4">
        <Court config={config} getState={getState} youSide={null} controls={setup.ai ? "online" : "local"} onInputs={onInputs} paused={phase !== "playing" || menu} onFirstMove={onFirstMove} onPoint={setLastPoint} />
        {phase === "countdown" && <CountdownOverlay onDone={startPlaying} />}
        {phase === "playing" && showControls && <ControlsCard local={!setup.ai} onClose={onFirstMove} />}
      </div>
      <GameMenu
        open={menu}
        onOpenChange={setMenu}
        online={false}
        onShowControls={() => {
          setMenu(false);
          setShowControls(true);
        }}
        onForfeit={onChangeSetup}
      />
    </div>
  );
}

/** Back goes where the player came from: the arcade hall, the lobby, or the landing page for guests. */
function useBackHref() {
  return useReturnTo().href;
}
