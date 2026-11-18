"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Radio, Trophy } from "lucide-react";
import type { CyclesState, GameConfig, GameState, LiveMatch, PartyPlayer, PartyState } from "shared";
import { applyCyclesDelta } from "shared/game-engine/cycles/CyclesEngine";
import { useI18n } from "@/i18n/I18nProvider";
import { GameSocket, type ConnectionStatus } from "@/lib/game/socket";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/form";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { Court } from "@/components/game/court";
import { ConnectionQuality, ScoreBoard } from "@/components/game/hud";
import { PartyCourt, PartyRoster } from "@/components/game/party";
import { CyclesCourt, CyclesRoster } from "@/components/game/cycles";

type View =
  | { k: "list" }
  | { k: "watching"; match: LiveMatch; config: GameConfig }
  /** a party (3–4 players): square court, lives per seat */
  | { k: "party"; match: LiveMatch; players: PartyPlayer[] }
  | { k: "ended"; match: LiveMatch; winner: string }
  | { k: "error"; message: string };

/** Spectator mode: the live public matches, or one match read-only (?room= or ?user=). */
export function WatchView() {
  const { t, href } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const roomParam = params.get("room");
  const userParam = params.get("user");
  const target = roomParam ? { roomId: roomParam } : userParam && /^\d+$/.test(userParam) ? { userId: Number(userParam) } : null;

  const [view, setView] = useState<View>({ k: "list" });
  const [matches, setMatches] = useState<LiveMatch[] | null>(null);
  const [spectators, setSpectators] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [ping, setPing] = useState<number>();
  const socketRef = useRef<GameSocket | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const partyRef = useRef<PartyState | null>(null);
  // re-rendered only when lives change
  const [partyRoster, setPartyRoster] = useState<PartyState | null>(null);
  const cyclesRef = useRef<CyclesState | null>(null);
  const [cyclesRoster, setCyclesRoster] = useState<CyclesState | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const socket = new GameSocket();
    socketRef.current = socket;
    const ask = () => socket.send({ type: target ? "spectate" : "liveMatches", data: target ?? {} });
    const offStatus = socket.onStatus((s) => {
      setStatus(s);
      if (s === "connected") ask();
    });
    const offMsg = socket.onMessage((msg) => {
      switch (msg.type) {
        case "liveMatchesList":
          setMatches(msg.data.matches);
          break;
        case "spectateStarted":
          if (msg.data.party) {
            const st = msg.data.party.state;
            if (st.kind === "cycles") {
              cyclesRef.current = st;
              setCyclesRoster(st);
              partyRef.current = null;
              setPartyRoster(null);
            } else {
              cyclesRef.current = null;
              setCyclesRoster(null);
              partyRef.current = st;
              setPartyRoster(st);
            }
            setSpectators(msg.data.match.spectators);
            setStartedAt((s) => s || Date.now());
            setView({ k: "party", match: msg.data.match, players: msg.data.party.players });
            break;
          }
          stateRef.current = msg.data.gameState;
          setScores([msg.data.gameState?.scores[0] ?? 0, msg.data.gameState?.scores[1] ?? 0]);
          setSpectators(msg.data.match.spectators);
          setStartedAt((s) => (s && viewRef.current.k === "watching" ? s : Date.now()));
          setView({ k: "watching", match: msg.data.match, config: msg.data.config });
          break;
        case "gameState": {
          const s = msg.data.gameState;
          stateRef.current = s;
          setScores((prev) => (prev[0] === s.scores[0] && prev[1] === s.scores[1] ? prev : [s.scores[0] ?? 0, s.scores[1] ?? 0]));
          break;
        }
        case "partyState": {
          const prev = partyRef.current;
          const next = msg.data.state;
          partyRef.current = next;
          const key = (s: PartyState | null) => (s ? s.paddles.map((p) => `${p.lives}${p.alive ? 1 : 0}`).join(",") : "");
          if (key(prev) !== key(next)) setPartyRoster(next);
          break;
        }
        case "cyclesTick": {
          const prev = cyclesRef.current;
          if (!prev) break;
          const next = applyCyclesDelta(prev, msg.data.delta);
          cyclesRef.current = next;
          if (msg.data.delta.crashed.length > 0 || next.phase !== prev.phase) setCyclesRoster(next);
          break;
        }
        case "partyEnd": {
          const v = viewRef.current;
          if (v.k === "party") setView({ k: "ended", match: v.match, winner: msg.data.winner?.name ?? "" });
          break;
        }
        case "spectatorCount":
          setSpectators(msg.data.count);
          break;
        case "gameStart":
          // a new round (tournaments change players): refresh who is playing
          if (viewRef.current.k === "watching") socket.send({ type: "spectate", data: { roomId: viewRef.current.match.roomId } });
          break;
        case "gameEnd": {
          const v = viewRef.current;
          if (v.k === "watching") setView({ k: "ended", match: v.match, winner: msg.data.winner?.name ?? "" });
          break;
        }
        case "tournamentEnd": {
          const v = viewRef.current;
          if (v.k === "watching") setView({ k: "ended", match: v.match, winner: msg.data.winner?.name ?? "" });
          break;
        }
        case "Error":
          if (msg.data.code === "SPECTATE_NOT_FOUND") setView({ k: "error", message: t("watch.notFound") });
          else if (msg.data.code === "SPECTATE_OWN_MATCH") setView({ k: "error", message: t("watch.ownMatch") });
          break;
      }
    });
    // the list refreshes itself
    const refresh = target ? undefined : setInterval(() => socket.status === "connected" && socket.send({ type: "liveMatches", data: {} }), 5000);
    return () => {
      offStatus();
      offMsg();
      clearInterval(refresh);
      socket.close();
      socketRef.current = null;
    };
    // target is derived from the URL; a new URL remounts through the key below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomParam, userParam]);

  // clock + connection quality, refreshed once a second while watching
  useEffect(() => {
    if (view.k !== "watching" && view.k !== "party") return;
    const id = setInterval(() => {
      setNow(Date.now());
      setPing(socketRef.current?.pingMs);
    }, 1000);
    return () => clearInterval(id);
  }, [view.k]);
  const seconds = startedAt && now > startedAt ? Math.floor((now - startedAt) / 1000) : 0;

  const getState = useCallback(() => stateRef.current, []);
  const getParty = useCallback(() => partyRef.current, []);
  const getCycles = useCallback(() => cyclesRef.current, []);
  const back = () => router.push(href("/watch"));

  if (view.k === "error")
    return (
      <Centered>
        <Callout tone="error">{view.message}</Callout>
        <Button onClick={back}>
          <ArrowLeft className="ico" aria-hidden />
          {t("watch.backToList")}
        </Button>
      </Centered>
    );

  if (view.k === "party" || (view.k === "ended" && view.match.mode === "party")) {
    return (
      <div className="flex h-dvh flex-col gap-3 p-3 md:p-6">
        <div className="row justify-between">
          <span className="row !gap-2 t-label">
            <Eye className="ico" aria-hidden />
            <span className="sr-only">{t("watch.watching")}: </span>
            {t(view.match.game === "cycles" ? "cycles.title" : "party.title")} · {t("watch.spectators", { n: spectators })}
          </span>
          <ConnectionQuality offline={status !== "connected"} ms={ping} />
        </div>
        {view.k === "party" && (cyclesRoster ? <CyclesRoster players={view.players} state={cyclesRoster} myId={null} /> : <PartyRoster players={view.players} state={partyRoster} myId={null} viewSide={0} />)}
        <div className="relative min-h-0 flex-1">
          {view.k === "party" && (cyclesRoster ? <CyclesCourt getState={getCycles} you={null} controls="none" /> : <PartyCourt getState={getParty} viewSide={0} you={null} controls="none" />)}
          {view.k === "ended" && (
            <div className="grid h-full place-items-center">
              <Panel className="stack stack-4 items-center text-center">
                <Trophy className="ico !h-8 !w-8 c-amber" aria-hidden />
                <h1 className="t-heading" role="status">
                  {view.winner ? t("watch.winner", { name: view.winner }) : t("party.noWinner")}
                </h1>
                <Button onClick={back}>{t("watch.backToList")}</Button>
              </Panel>
            </div>
          )}
        </div>
        {view.k === "party" && (
          <div className="row justify-center">
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="ico" aria-hidden />
              {t("watch.stop")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (view.k === "watching" || view.k === "ended") {
    const [a, b] = view.match.players;
    return (
      <div className="flex h-dvh flex-col gap-3 p-3 md:p-6">
        <ScoreBoard
          left={{ name: a?.name ?? "…" }}
          right={{ name: b?.name ?? "…" }}
          scores={scores}
          seconds={seconds}
          // colours follow the court: player 1 magenta (left), player 2 cyan (right)
          leftIsYou
          mode={
            <span className="row !gap-2">
              <Eye className="ico" aria-hidden />
              <span className="sr-only">{t("watch.watching")}: </span>
              {t("watch.spectators", { n: spectators })}
            </span>
          }
          connection={<ConnectionQuality offline={status !== "connected"} ms={ping} />}
        />
        <div className="relative min-h-0 flex-1">
          {view.k === "watching" && <Court config={view.config} getState={getState} youSide={null} controls="none" />}
          {view.k === "ended" && (
            <div className="grid h-full place-items-center">
              <Panel className="stack stack-4 items-center text-center">
                <Trophy className="ico !h-8 !w-8 c-amber" aria-hidden />
                <h1 className="t-heading" role="status">
                  {t("watch.winner", { name: view.winner })}
                </h1>
                <Button onClick={back}>{t("watch.backToList")}</Button>
              </Panel>
            </div>
          )}
        </div>
        {view.k === "watching" && (
          <div className="row justify-center">
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="ico" aria-hidden />
              {t("watch.stop")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---- list
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-4 md:p-8">
      <Link href={href("/lobby")} className="row t-label no-underline">
        <ArrowLeft className="ico" aria-hidden />
        {t("common.back")}
      </Link>
      <div>
        <h1 className="pix pix-md uppercase">{t("watch.title")}</h1>
        <p className="muted mt-1">{t("watch.subtitle")}</p>
      </div>
      <Panel aria-live="polite">
        {target ? (
          <Skeleton style={{ height: 40 }} />
        ) : matches === null ? (
          <div className="stack stack-3">
            <Skeleton style={{ height: 40 }} />
            <Skeleton style={{ height: 40 }} />
          </div>
        ) : matches.length === 0 ? (
          <EmptyState icon={<Radio className="ico" aria-hidden />} title={t("watch.empty")} body={t("watch.emptyBody")} />
        ) : (
          <ul className="stack">
            {matches.map((m) => (
              <li key={m.roomId} className="list-row">
                <div className="grow min-w-0">
                  <p className="t-strong truncate">
                    {m.players.map((p) => p.name).join(m.mode === "party" ? " · " : " vs ")}
                    {m.mode === "tournament" && <span className="t-caption subtle"> · {t("watch.tournament")}</span>}
                    {m.mode === "party" && <span className="t-caption subtle"> · {t(m.game === "cycles" ? "cycles.title" : "watch.party")}</span>}
                  </p>
                  <p className="t-caption muted row !gap-2">
                    <span className="num">{m.mode === "party" ? (m.game === "cycles" ? t("cycles.ridingCount", { n: m.scores.filter((x) => x > 0).length }) : t("party.livesList", { list: m.scores.join(" · ") })) : m.scores.join(" – ")}</span>
                    <span aria-hidden>·</span>
                    <Eye className="ico !h-3.5 !w-3.5" aria-hidden />
                    {t("watch.spectators", { n: m.spectators })}
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href={`${href("/watch")}?room=${encodeURIComponent(m.roomId)}`} className="no-underline">
                    <Eye className="ico" aria-hidden />
                    {t("watch.watch")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 p-4">{children}</div>;
}
