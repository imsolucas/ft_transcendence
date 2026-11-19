"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { ArrowLeft, CalendarDays, Coins, Flame, Trophy } from "lucide-react";
import type { GameState, PlayerInputs } from "shared";
import {
  DAILY_INITIALS,
  DAILY_TICK_S,
  DailyInputLog,
  DailyRun,
  inputBits,
  type DailyChallenge,
} from "shared/daily/daily";
import { useI18n } from "@/i18n/I18nProvider";
import { useReturnTo } from "@/lib/return-to";
import { usePrefs } from "@/lib/prefs";
import { api, ApiError, fetcher } from "@/lib/api";
import { useSignedIn } from "@/lib/session";
import type { DailyFinish, DailyInfo, DailyStart, Me } from "@/lib/types";
import { HitStop } from "@/lib/game/fx";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { Avatar, Badge, EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { Court } from "@/components/game/court";
import { ControlsCard, CountdownOverlay, GameMenu, ScoreBoard } from "@/components/game/hud";
import { Bit } from "@/components/arcade/bit";
import { TickNumber } from "@/components/arcade/tick-number";
import { PixelBurst } from "@/components/arcade/pixel-burst";

type Play = { practice: false; start: DailyStart } | { practice: true; seed: number; challenge: DailyChallenge };
type Result = { practice: true; score: number } | { practice: false; finish: DailyFinish };

/** Daily Challenge: today's twist and board → a run against BIT → the result. */
export function DailyView() {
  const { t, href } = useI18n();
  const back = useReturnTo();
  const signedIn = useSignedIn();
  // guests never ask /api/me (its 401 would open the "session expired" dialog)
  const { data: user } = useSWR<Me>(signedIn ? "/api/me" : null, fetcher, { revalidateOnFocus: false });
  const { data, error, mutate } = useSWR<DailyInfo>("/api/daily", fetcher, { revalidateOnFocus: false });
  const [play, setPlay] = useState<Play | null>(null);
  const [pending, setPending] = useState<{ log: number[]; score: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** the server refused the initials (word filter): ask again */
  const [badInitials, setBadInitials] = useState(false);
  const retryInitials = useRef<string | undefined>(undefined);

  const errorText = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 409) return t(pending ? "daily.errAlreadyOver" : "daily.errNoTries");
      if (err.status === 429) return t("daily.errBusy");
      if (err.status === 422) return t("daily.errUnverified");
      if (err.status === 410) return t("daily.errTimedOut");
      if (err.status === 0) return t("common.networkError");
    }
    return t("daily.errGeneric");
  };

  const insertCoin = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const start = await api.post<DailyStart>("/api/daily/start");
      setResult(null);
      setPlay({ practice: false, start });
      void mutate();
    } catch (err) {
      setProblem(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const practice = () => {
    if (!data) return;
    setResult(null);
    setProblem(null);
    setPlay({ practice: true, seed: Math.floor(Math.random() * 2 ** 31), challenge: data.challenge });
  };

  const submit = async (log: number[], initials?: string) => {
    if (!play || play.practice) return;
    retryInitials.current = initials;
    setBusy(true);
    setProblem(null);
    try {
      const finish = await api.post<DailyFinish>(`/api/daily/runs/${play.start.runId}/finish`, initials ? { log, initials } : { log });
      setPending(null);
      setResult({ practice: false, finish });
      setPlay(null);
      void mutate();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1;
      if (status === 400) {
        // only the initials can be refused (the log is checked by replay): pick others, same run
        setBadInitials(true);
        return;
      }
      setProblem(errorText(err));
      // offline, rate limited or a server error: the run isn't closed yet, so keep the log for a retry.
      // Anything else (verified as 0, timed out, already over) is the final answer.
      const retryable = status === 0 || status === 429 || status >= 500 || status === -1;
      if (!retryable) {
        setPending(null);
        setPlay(null);
        void mutate();
      }
    } finally {
      setBusy(false);
    }
  };

  const onOver = (log: number[], score: number) => {
    if (!play) return;
    if (play.practice) {
      setResult({ practice: true, score });
      setPlay(null);
      return;
    }
    setPending({ log, score });
    // first time on the board: ask for initials, like a cabinet
    if (data?.me?.initials) void submit(log);
  };

  // ---- a run in progress
  if (play && !pending) {
    const challenge = play.practice ? play.challenge : play.start.challenge;
    const seed = play.practice ? play.seed : play.start.seed;
    return <DailyGame key={seed} challenge={challenge} seed={seed} practice={play.practice} player={{ name: user?.displayName ?? t("common.you"), avatar: user?.avatar ?? null, look: user?.look ?? null }} onOver={onOver} />;
  }

  // ---- game over, waiting for initials / the server's check
  if (pending) {
    return (
      <SubmitScreen
        score={pending.score}
        busy={busy}
        problem={problem}
        askInitials={!data?.me?.initials || badInitials}
        initialsRefused={badInitials}
        defaultInitials={(user?.username ?? "").toUpperCase().replace(/[^A-Z]/g, "").padEnd(3, "X").slice(0, 3)}
        onSubmit={(initials) => {
          setBadInitials(false);
          void submit(pending.log, initials);
        }}
        onRetry={() => submit(pending.log, retryInitials.current)}
      />
    );
  }

  const me = data?.me ?? null;
  const left = me?.attemptsLeft ?? 0;
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <Link href={back.href} className="row t-label mb-4 no-underline text-fg-muted">
        <ArrowLeft className="ico" aria-hidden /> {t("common.back")}
      </Link>
      <header className="row mb-6 !gap-4">
        <Bit mood="idle" size={56} />
        <div>
          <h1 className="pix text-[22px]">{t("daily.title")}</h1>
          <p className="muted">{t("daily.subtitle")}</p>
        </div>
      </header>

      {result && <ResultPanel result={result} attemptsLeft={left} busy={busy} onInsertCoin={insertCoin} onPractice={practice} />}
      {problem && !result && (
        <p role="alert" className="field-error mb-4">
          {problem}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <Panel>
          {!data ? (
            error ? (
              <EmptyState title={t("common.error")} action={<Button onClick={() => mutate()}>{t("common.retry")}</Button>} />
            ) : (
              <div className="grid gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-48" />
              </div>
            )
          ) : (
            <div className="grid gap-5">
              <div>
                <p className="t-label muted">{t("daily.todaysTwist")}</p>
                <h2 className="t-title mt-1">{t(`daily.twist.${data.challenge.twist}.title`)}</h2>
                <p className="muted mt-1">{t(`daily.twist.${data.challenge.twist}.body`)}</p>
                <p className="t-caption subtle mt-2 row !gap-2">
                  <CalendarDays className="ico" aria-hidden />
                  <ResetsIn at={data.resetsAt} />
                </p>
              </div>

              {me && (
                <dl className="grid grid-cols-3 gap-3">
                  <Stat label={t("daily.tries")} value={t("daily.triesLeft", { n: left, total: data.attempts })} icon={<Coins className="ico c-amber" aria-hidden />} />
                  <Stat label={t("daily.best")} value={me.best === null ? "—" : String(me.best)} icon={<Trophy className="ico c-amber" aria-hidden />} />
                  <Stat label={t("daily.streak")} value={String(me.streak)} icon={<Flame className="ico c-magenta" aria-hidden />} />
                </dl>
              )}

              {signedIn === false ? (
                <div className="grid gap-3">
                  <p>{t("daily.guestPrompt")}</p>
                  <div className="row wrap">
                    <Button asChild variant="primary" glow="md" size="lg">
                      <Link href={href("/signup")}>{t("daily.signUp")}</Link>
                    </Button>
                    <Button asChild size="lg">
                      <Link href={`${href("/login")}?next=${encodeURIComponent(href("/daily"))}`}>{t("daily.logIn")}</Link>
                    </Button>
                  </div>
                </div>
              ) : me && left > 0 ? (
                <div className="row wrap">
                  <Button variant="primary" glow="md" size="lg" loading={busy} onClick={insertCoin}>
                    <Coins className="ico" aria-hidden />
                    {t("daily.insertCoinTry", { n: me.attemptsUsed + 1, total: data.attempts })}
                  </Button>
                  <Button size="lg" variant="ghost" onClick={practice}>
                    {t("daily.practice")}
                  </Button>
                </div>
              ) : me ? (
                <div className="grid gap-3">
                  <p className="muted">{t("daily.practiceNote")}</p>
                  <div>
                    <Button size="lg" onClick={practice}>
                      {t("daily.practice")}
                    </Button>
                  </div>
                </div>
              ) : null}
              <p className="t-caption subtle">{t("daily.rules")}</p>
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="t-heading mb-3 row !gap-2">
            <Trophy className="ico c-amber" aria-hidden />
            {t("daily.board")}
          </h2>
          <Board info={data} meId={user?.id ?? null} />
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="panel panel-2 !p-3">
      <dt className="t-label muted row !gap-2">
        {icon}
        {label}
      </dt>
      <dd className="num t-title mt-1">{value}</dd>
    </div>
  );
}

function ResetsIn({ at }: { at: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, Date.parse(at) - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return <span>{t("daily.resetsIn", { time: `${h}h ${String(m).padStart(2, "0")}m` })}</span>;
}

function Board({ info, meId }: { info: DailyInfo | undefined; meId: number | null }) {
  const { t, href } = useI18n();
  if (!info)
    return (
      <div className="grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  if (info.board.length === 0) return <EmptyState icon={<Trophy className="ico" aria-hidden />} title={t("daily.boardEmpty")} body={t("daily.boardEmptyBody")} />;
  return (
    <ol className="grid gap-1">
      {info.board.map((row) => (
        <li key={row.user.id} className={row.user.id === meId ? "list-row is-selected" : "list-row"}>
          <span className="num w-8 text-right muted">{row.rank}</span>
          <span className="pix pix-sm c-amber w-14">{row.initials}</span>
          <Link href={href(`/profile/${row.user.username}`)} className="row min-w-0 grow !gap-2 no-underline text-fg">
            <Avatar name={row.user.displayName} src={row.user.avatar} look={row.user.look} size="sm" />
            <span className="truncate">{row.user.displayName}</span>
          </Link>
          <span className="num t-strong">{t("daily.points", { n: row.score })}</span>
        </li>
      ))}
    </ol>
  );
}

function ResultPanel({ result, attemptsLeft, busy, onInsertCoin, onPractice }: { result: Result; attemptsLeft: number; busy: boolean; onInsertCoin: () => void; onPractice: () => void }) {
  const { t } = useI18n();
  const score = result.practice ? result.score : result.finish.score;
  const best = !result.practice && result.finish.newBest && score > 0;
  return (
    <Panel className="relative mb-4 overflow-hidden">
      {best && <PixelBurst />}
      <div className="row wrap !gap-6" aria-live="polite">
        <Bit mood={best ? "cheer" : "sad"} size={72} />
        <div className="grid gap-1">
          <p className="pix c-amber">{t("daily.gameOver")}</p>
          <p className="row !gap-3">
            <span className="t-label muted">{t("daily.yourScore")}</span>
            <TickNumber value={score} className="num text-[40px] leading-none" />
          </p>
          <div className="row wrap !gap-2">
            {result.practice ? (
              <Badge>{t("daily.practiceResult")}</Badge>
            ) : (
              <>
                {best && <Badge tone="magenta">{t("daily.newBest")}</Badge>}
                {result.finish.rank !== null && <Badge tone="amber">{t("daily.rankToday", { n: result.finish.rank })}</Badge>}
                {result.finish.xpGained > 0 && <Badge tone="green">{t("daily.xpGained", { n: result.finish.xpGained })}</Badge>}
                <Badge tone="cyan" icon={<Flame className="ico" aria-hidden />}>
                  {t("daily.streakDays", { n: result.finish.streak })}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="row wrap ml-auto">
          {attemptsLeft > 0 ? (
            <Button variant="primary" glow="md" loading={busy} onClick={onInsertCoin}>
              <Coins className="ico" aria-hidden />
              {t("daily.insertCoin")}
            </Button>
          ) : (
            <Button onClick={onPractice}>{t("daily.practice")}</Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function SubmitScreen({
  score,
  busy,
  problem,
  askInitials,
  initialsRefused,
  defaultInitials,
  onSubmit,
  onRetry,
}: {
  score: number;
  busy: boolean;
  problem: string | null;
  askInitials: boolean;
  initialsRefused: boolean;
  defaultInitials: string;
  onSubmit: (initials: string) => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const [initials, setInitials] = useState(defaultInitials);
  const [invalid, setInvalid] = useState(false);
  const fieldError = invalid ? t("daily.initialsInvalid") : initialsRefused ? t("daily.initialsRefused") : undefined;
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!DAILY_INITIALS.test(initials)) return setInvalid(true);
    onSubmit(initials);
  };
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[480px] content-center gap-6 px-4 py-8 text-center">
      <p className="pix c-amber text-[22px]">{t("daily.gameOver")}</p>
      <p className="num text-[56px] leading-none">{score}</p>
      {askInitials && !busy && !problem ? (
        <form onSubmit={save} className="grid gap-4 text-left" noValidate>
          <h1 className="pix text-center">{t("daily.initialsTitle")}</h1>
          <FormField label={t("daily.initialsLabel")} hint={t("daily.initialsHint")} error={fieldError}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={initials}
                autoFocus
                maxLength={3}
                autoComplete="off"
                spellCheck={false}
                className="pix text-[22px] [&_input]:text-center [&_input]:tracking-[0.4em]"
                invalid={!!fieldError}
                onChange={(e) => {
                  setInvalid(false);
                  setInitials(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3));
                }}
              />
            )}
          </FormField>
          <Button type="submit" variant="primary" glow="md" size="lg" block>
            {t("daily.saveScore")}
          </Button>
        </form>
      ) : problem ? (
        <div className="grid gap-3">
          <p role="alert" className="field-error justify-center">
            {problem}
          </p>
          <div>
            <Button onClick={onRetry} loading={busy}>
              {t("common.retry")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="muted" aria-live="polite">
          {t("daily.saving")}
        </p>
      )}
    </div>
  );
}

/**
 * The run itself. Fixed 1/60 s steps (an accumulator over animation frames), so the server's
 * replay of the input log produces exactly this game. Pausing (menu) and the hit-stop freeze
 * only stop time; they never change the simulation.
 */
function DailyGame({
  challenge,
  seed,
  practice,
  player,
  onOver,
}: {
  challenge: DailyChallenge;
  seed: number;
  practice: boolean;
  player: { name: string; avatar: string | null; look: Me["look"] | null };
  onOver: (log: number[], score: number) => void;
}) {
  const { t } = useI18n();
  const { prefs, setPref } = usePrefs();
  const [run] = useState(() => new DailyRun(challenge, seed));
  const [log] = useState(() => new DailyInputLog());
  const inputs = useRef<PlayerInputs | null>(null);
  const state = useRef<GameState>(run.state);
  const [phase, setPhase] = useState<"countdown" | "playing" | "over">("countdown");
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [seconds, setSeconds] = useState(0);
  const [menu, setMenu] = useState(false);
  const [showControls, setShowControls] = useState(!prefs.seenControls);
  const done = useRef(onOver);
  useEffect(() => {
    done.current = onOver;
  }, [onOver]);

  const finish = useCallback(() => {
    setPhase("over");
    done.current(log.toArray(), run.score);
  }, [log, run]);

  useEffect(() => {
    if (phase !== "playing" || menu) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const hitStop = new HitStop();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!hitStop.frozen(now)) {
        acc += dt;
        while (acc >= DAILY_TICK_S && !run.over) {
          const bits = inputBits(inputs.current);
          log.push(bits);
          run.step(bits);
          acc -= DAILY_TICK_S;
        }
      }
      const s = run.state;
      hitStop.check(s, now);
      state.current = s;
      const a = s.scores[0] ?? 0;
      const b = s.scores[1] ?? 0;
      setScores((prev) => (prev[0] === a && prev[1] === b ? prev : [a, b]));
      if (run.over) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, menu, run, log, finish]);

  useEffect(() => {
    if (phase !== "playing" || menu) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase, menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "playing") setMenu((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const getState = useCallback(() => state.current, []);
  const onInputs = useCallback((p1: PlayerInputs) => {
    inputs.current = p1;
  }, []);
  const onFirstMove = useCallback(() => {
    setShowControls(false);
    setPref("seenControls", true);
  }, [setPref]);
  const startPlaying = useCallback(() => setPhase("playing"), []);
  const lives = Math.max(0, 3 - scores[1]);

  return (
    <div className="flex h-dvh flex-col">
      <ScoreBoard
        left={{ ...player, meta: t("daily.livesLeft", { n: lives }) }}
        right={{ name: "BIT", meta: t(`daily.twist.${challenge.twist}.title`) }}
        scores={scores}
        seconds={seconds}
        leftIsYou
        mode={practice ? `${t("daily.title")} · ${t("daily.practice")}` : t("daily.title")}
        onMenu={() => setMenu(true)}
      />
      <div className="relative flex-1 p-4">
        <Court config={run.config} getState={getState} youSide={0} controls="online" onInputs={onInputs} paused={phase !== "playing" || menu} onFirstMove={onFirstMove} />
        {phase === "countdown" && <CountdownOverlay onDone={startPlaying} />}
        {phase === "playing" && showControls && <ControlsCard local={false} onClose={onFirstMove} />}
      </div>
      <GameMenu
        open={menu}
        onOpenChange={setMenu}
        online={false}
        onShowControls={() => {
          setMenu(false);
          setShowControls(true);
        }}
        onForfeit={() => {
          setMenu(false);
          finish();
        }}
        forfeitLabel={t("daily.endRun")}
        confirmTitle={t("daily.endRunTitle")}
        confirmBody={t(practice ? "daily.endRunPracticeBody" : "daily.endRunBody")}
      />
    </div>
  );
}
