"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { ArrowLeft, Bot, Trophy } from "lucide-react";
import { defaultLook, type CyclesState, type PartyPlayer } from "shared";
import { CyclesEngine } from "shared/game-engine/cycles/CyclesEngine";
import { chooseTurn, type CyclesBotLevel } from "shared/game-engine/cycles/CyclesBot";
import { useI18n } from "@/i18n/I18nProvider";
import { useReturnTo } from "@/lib/return-to";
import { useSignedIn } from "@/lib/session";
import { fetcher } from "@/lib/api";
import type { Me } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, Panel, Segmented } from "@/components/ui/primitives";
import { GameMenu } from "@/components/game/hud";
import { CyclesCourt, CyclesRoster } from "@/components/game/cycles";

interface Setup {
  bots: 1 | 2 | 3;
  level: CyclesBotLevel;
}

const YOU = 0;
/** fixed seeds so each bot always wears the same pixel look */
const BOT_SEEDS = [7001, 7002, 7003];

/**
 * Light Cycles against bots, entirely in the browser: the shared CyclesEngine runs here and
 * the bots (shared CyclesBot) steer once per step. Nothing is sent to the server and nothing
 * is recorded (stats, coins and quests only count real races).
 */
export function CyclesSolo() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [round, setRound] = useState(0);
  if (!setup) return <SetupForm onStart={setSetup} />;
  return <SoloRace key={round} setup={setup} onPlayAgain={() => setRound((r) => r + 1)} onChangeSetup={() => setSetup(null)} />;
}

function SetupForm({ onStart }: { onStart: (s: Setup) => void }) {
  const { t } = useI18n();
  const back = useReturnTo();
  const [s, setS] = useState<Setup>({ bots: 3, level: "normal" });

  function submit(e: FormEvent) {
    e.preventDefault();
    onStart(s);
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-8 md:px-8">
      <Link href={back.href} className="row t-label mb-4 no-underline text-fg-muted">
        <ArrowLeft className="ico" aria-hidden /> {t("common.back")}
      </Link>
      <h1 className="pix pix-md mb-1">{t("cyclesSolo.title")}</h1>
      <p className="muted mb-6">{t("cyclesSolo.subtitle")}</p>
      <form onSubmit={submit} className="stack stack-5" noValidate>
        <Panel>
          <div className="stack stack-5">
            <div className="stack">
              <span className="t-label">{t("cyclesSolo.bots")}</span>
              <Segmented
                label={t("cyclesSolo.bots")}
                value={String(s.bots)}
                onChange={(v) => setS({ ...s, bots: Number(v) as Setup["bots"] })}
                options={(["1", "2", "3"] as const).map((v) => ({ value: v, label: v }))}
              />
            </div>
            <div className="stack">
              <span className="t-label">{t("local.difficulty")}</span>
              <Segmented
                label={t("local.difficulty")}
                value={s.level}
                onChange={(v) => setS({ ...s, level: v })}
                options={(["easy", "normal", "hard"] as const).map((v) => ({ value: v, label: t(`local.${v}`) }))}
              />
            </div>
            <p className="t-caption subtle">{t("cycles.keys")}</p>
          </div>
        </Panel>
        <p className="t-caption subtle">{t("cyclesSolo.notRecorded")}</p>
        <div className="row wrap">
          <Button type="submit" variant="primary" glow="md" size="lg">
            {t("cyclesSolo.start")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SoloRace({ setup, onPlayAgain, onChangeSetup }: { setup: Setup; onPlayAgain: () => void; onChangeSetup: () => void }) {
  const { t } = useI18n();
  const back = useReturnTo();
  const signedIn = useSignedIn();
  // guests never ask /api/me (its 401 would open the "session expired" dialog)
  const { data: me } = useSWR<Me>(signedIn ? "/api/me" : null, fetcher, { revalidateOnFocus: false });
  const [engine] = useState(() => new CyclesEngine(setup.bots + 1));
  const [initial] = useState(() => engine.getState());
  const state = useRef<CyclesState>(initial);
  const [roster, setRoster] = useState<CyclesState>(initial);
  const [menu, setMenu] = useState(false);
  const [result, setResult] = useState<{ place: number; riders: number; draw: boolean } | null>(null);

  const players: PartyPlayer[] = [
    { id: "you", name: me?.displayName || t("common.you"), picture: me?.avatar ?? undefined, look: me?.look, seat: YOU },
    ...BOT_SEEDS.slice(0, setup.bots).map((seed, i) => ({ id: `bot-${i + 1}`, name: t("cyclesSolo.botName", { n: i + 1 }), look: defaultLook(seed), seat: i + 1 })),
  ];

  // simulation: the bots steer once per step, then the engine advances (paused in the menu)
  useEffect(() => {
    if (result || menu) return;
    let raf = 0;
    let last = performance.now();
    let decided = -1;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (engine.phase === "playing" && engine.steps !== decided) {
        for (let seat = 1; seat <= setup.bots; seat++) {
          const turn = chooseTurn(engine, seat, setup.level);
          if (turn !== 0) {
            // a press then a release queues exactly one turn
            engine.input(seat, { left: turn < 0, right: turn > 0 });
            engine.input(seat, { left: false, right: false });
          }
        }
        decided = engine.steps;
      }
      const before = engine.phase;
      const deltas = engine.tick(dt);
      if (deltas.length > 0 || engine.phase !== before) {
        const s = engine.getState();
        state.current = s;
        if (deltas.some((d) => d.crashed.length > 0) || s.phase !== before) setRoster(s);
        const youOut = !s.cycles[YOU]?.alive;
        if (youOut || s.phase === "over") {
          const alive = s.cycles.filter((c) => c.alive).length;
          // crashing in the same step shares a place; everyone out together is a draw
          setResult({ place: youOut ? alive + 1 : 1, riders: s.cycles.length, draw: s.phase === "over" && s.winner === null });
          return;
        }
      } else if (engine.phase === "countdown") {
        // keep the countdown number moving
        const s = engine.getState();
        if (Math.ceil(s.countdownIn) !== Math.ceil(state.current.countdownIn)) setRoster(s);
        state.current = s;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, setup, result, menu]);

  useEffect(() => {
    // Esc toggles the menu (the menu dialog leaves Esc to us)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !result) setMenu((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  const getState = useCallback(() => state.current, []);
  const onInputs = useCallback((d: { left: boolean; right: boolean }) => engine.input(YOU, d), [engine]);

  if (result) {
    const won = result.place === 1 && !result.draw;
    return (
      <div className="mx-auto grid min-h-dvh w-full max-w-[560px] place-items-center px-4 py-8">
        <Panel className="w-full text-center">
          <div className="stack stack-4 items-center">
            {won ? <Trophy className="ico !h-10 !w-10 c-amber" aria-hidden /> : <Bot className="ico !h-10 !w-10 c-magenta" aria-hidden />}
            <h1 className="pix pix-md">{result.draw ? t("cycles.noWinner") : won ? t("cyclesSolo.youWin") : t("cyclesSolo.crashedOut")}</h1>
            <p className="muted">
              {t("cyclesSolo.place", { place: result.place, n: result.riders })} · {t(`local.${setup.level}`)}
            </p>
            <div className="row wrap justify-center">
              <Button variant="primary" glow="md" size="lg" onClick={onPlayAgain}>
                {t("game.playAgain")}
              </Button>
              <Button size="lg" onClick={onChangeSetup}>
                {t("cyclesSolo.changeSetup")}
              </Button>
            </div>
            <Link href={back.href} className="t-label">
              {back.label}
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const countdown = roster.phase === "countdown" ? Math.ceil(roster.countdownIn) : 0;
  return (
    <div className="flex h-dvh flex-col gap-3 p-3 md:p-4">
      <div className="row justify-between">
        <span className="row !gap-2 t-label">
          <Bot className="ico c-magenta" aria-hidden />
          {t("cyclesSolo.title")}
          <Badge>{t(`local.${setup.level}`)}</Badge>
        </span>
        <Button size="sm" variant="ghost" onClick={() => setMenu(true)}>
          {t("game.menu")}
        </Button>
      </div>
      <CyclesRoster players={players} state={roster} myId="you" />
      <div className="relative min-h-0 flex-1">
        <CyclesCourt getState={getState} you={YOU} controls="online" onInputs={onInputs} paused={menu} />
        {countdown > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-2 text-center" aria-live="polite">
            <span className="pix pix-md c-amber">
              {t("cycles.getReady")} {countdown}
            </span>
          </div>
        )}
      </div>
      <p className="t-caption subtle text-center max-md:hidden">{t("cycles.keys")}</p>
      <GameMenu open={menu} onOpenChange={setMenu} online={false} onShowControls={() => setMenu(false)} onForfeit={onChangeSetup} />
    </div>
  );
}
