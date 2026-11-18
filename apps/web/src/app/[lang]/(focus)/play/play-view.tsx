"use client";

import Link from "next/link";
import { TickNumber } from "@/components/arcade/tick-number";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Eye, Trophy } from "lucide-react";
import { InviteShare } from "@/components/game/invite-share";
import { Replay } from "@/components/game/replay";
import { DivisionBadge } from "@/components/game/ranked";
import type { ReplayFrame } from "@/lib/game/fx";
import type { Division, GameState, PlayerInputs, serializablePlayer, TournamentState } from "shared";
import { PLACEMENT_GAMES } from "shared";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "@/lib/session";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePrefs } from "@/lib/prefs";
import { announceAchievement, announceLevelUp } from "@/lib/realtime";
import { GameSocket, type ConnectionStatus, type ServerMessage } from "@/lib/game/socket";
import { baseGameConfig } from "@/lib/game/config";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Modal, Panel, Spinner } from "@/components/ui/primitives";
import { Court } from "@/components/game/court";
import { ConnectionQuality, ControlsCard, CountdownOverlay, GameMenu, MatchEnd, ReconnectingOverlay, ScoreBoard } from "@/components/game/hud";
import { BracketView, ChampionBanner, currentMatch, isOut, nextMatchOf, roundName } from "@/components/game/bracket-view";

export type PlayMode = "quick" | "create" | "join" | "tournament-create" | "tournament-join";

type Phase =
  | { k: "connecting" }
  | { k: "searching"; since: number }
  | { k: "waiting"; roomId: string; tournament: boolean }
  | { k: "found"; roomId: string; tournament: boolean }
  /** tournament room between games: registration, ready check, results, champion (server phase) */
  | { k: "tournament" }
  | { k: "countdown" }
  | { k: "playing" }
  | { k: "ended"; winnerId: string | null; reason?: "left" }
  | { k: "error"; message: string; retry: boolean };

const SEARCH_TIMEOUT_MS = 60_000;

export function PlayView() {
  const params = useSearchParams();
  const mode = (params.get("mode") as PlayMode) ?? "quick";
  const code = params.get("code") ?? "";
  const size = Math.min(8, Math.max(3, Number(params.get("size")) || 4));
  // Opened from chat ("Invite to game"): send the new room's code to this player
  const invite = params.get("invite");
  const [attempt, setAttempt] = useState(0);
  return <OnlineMatch key={`${mode}-${code}-${attempt}`} mode={mode} code={code} size={size} invite={attempt === 0 ? invite : null} onRestart={() => setAttempt((a) => a + 1)} />;
}

function OnlineMatch({ mode, code, size, invite, onRestart }: { mode: PlayMode; code: string; size: number; invite: string | null; onRestart: () => void }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const { me } = useMe();
  const { prefs, setPref } = usePrefs();
  const socketRef = useRef<GameSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [phase, setPhase] = useState<Phase>({ k: "connecting" });
  const [players, setPlayers] = useState<serializablePlayer[]>([]);
  const [readySent, setReadySent] = useState(false);
  const [watchers, setWatchers] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [seconds, setSeconds] = useState(0);
  const [menu, setMenu] = useState(false);
  const [showControls, setShowControls] = useState(!prefs.seenControls);
  const [ping, setPing] = useState<number | undefined>();
  // frames of the latest finished point, replayed in slow motion on the end screen
  const [lastPoint, setLastPoint] = useState<ReplayFrame[]>([]);
  // ranked: this player's rating change after the match
  const [ratingChange, setRatingChange] = useState<RatingChange | null>(null);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  // local-clock end of the bracket match's ready check (from the server's remaining time)
  const [readyEndsAt, setReadyEndsAt] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Opponent dropped mid-match: paused until this time (ms epoch)
  const [opponentAway, setOpponentAway] = useState<{ name: string; deadline: number } | null>(null);
  // Rematch: did I ask, and who asked me
  const [rematchAsked, setRematchAsked] = useState(false);
  const [rematchFrom, setRematchFrom] = useState<string | null>(null);
  const [readyDeadline, setReadyDeadline] = useState<number | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const config = useMemo(() => baseGameConfig(), []);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;

  const myId = me ? String(me.id) : null;
  const invitedRef = useRef(false);
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  // ---- socket lifecycle
  useEffect(() => {
    const socket = new GameSocket();
    socketRef.current = socket;
    const offNotify = socket.onNotify((e) => {
      if (e.type === "achievement") announceAchievement(e.id, t);
      else if (e.type === "levelUp") announceLevelUp(e.level, t);
    });

    const offStatus = socket.onStatus((s, error) => {
      setStatus(s);
      if (s === "disconnected") {
        const p = phaseRef.current.k;
        if (p === "ended") return;
        const message =
          error === "UNAUTHORIZED"
            ? t("auth.sessionExpiredBody")
            : error === "TOO_MANY_CONNECTIONS"
              ? t("matchmaking.alreadyConnected")
              : t("matchmaking.disconnected");
        setPhase({ k: "error", message, retry: error !== "UNAUTHORIZED" });
      }
    });

    const offMsg = socket.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case "connectionSuccess": {
          const current = phaseRef.current.k;
          if (current === "playing" || current === "countdown") {
            // We came back after the reconnect grace period: the match was forfeited
            setPhase({ k: "error", message: t("game.forfeitedOnDisconnect"), retry: true });
            break;
          }
          if (current === "waiting" || current === "found" || current === "tournament") {
            // The server dropped us from the room while we were away; don't silently make a new one
            setPhase({ k: "error", message: t("matchmaking.disconnected"), retry: true });
            break;
          }
          if (current === "searching") {
            socket.send({ type: "joinQueue", data: { roomType: "standard" } });
            break;
          }
          if (mode === "quick") {
            socket.send({ type: "joinQueue", data: { roomType: "standard" } });
            setPhase({ k: "searching", since: Date.now() });
          } else if (mode === "create" || mode === "tournament-create") {
            const tournamentMode = mode === "tournament-create";
            socket.send({
              type: "createRoom",
              data: { config: { ...baseGameConfig(), isPrivate: true, mode: tournamentMode ? "tournament" : "standard", numPlayers: tournamentMode ? size : 2, pointsToWin: tournamentMode ? 3 : 5 } },
            });
          } else {
            socket.send({ type: "joinRoom", data: { roomId: code.trim().toLowerCase() } });
          }
          break;
        }
        case "connectionError": {
          const c = (msg.data as { code?: string }).code;
          setPhase({ k: "error", message: c === "ALREADY_CONNECTED" ? t("matchmaking.alreadyConnected") : t("matchmaking.disconnected"), retry: true });
          break;
        }
        case "queueJoined":
          break;
        case "playerJoined": {
          const data = msg.data as { roomId: string; playersInRoom: serializablePlayer[] };
          setPlayers(data.playersInRoom);
          if (mode.startsWith("tournament")) {
            // the bracket state that follows drives the screen
            setPhase((p) => (p.k === "playing" || p.k === "countdown" ? p : { k: "tournament" }));
            break;
          }
          if (invite && mode === "create" && !invitedRef.current) {
            invitedRef.current = true;
            api
              .post(`/api/chat/${encodeURIComponent(invite)}/messages`, { invite: data.roomId })
              .then(() => toast.success(t("chat.inviteSent")))
              .catch(() => toast.error(t("chat.unavailable")));
          }
          const isTournament = mode.startsWith("tournament");
          const enough = isTournament ? data.playersInRoom.length >= 3 : data.playersInRoom.length >= 2;
          setPhase((p) => {
            if (p.k === "playing" || p.k === "countdown" || p.k === "ended") return p;
            if (!enough || (isTournament && p.k === "waiting")) return { k: "waiting", roomId: data.roomId, tournament: isTournament };
            if (!isTournament) setReadyDeadline(Date.now() + 30_000);
            return { k: "found", roomId: data.roomId, tournament: isTournament };
          });
          break;
        }
        case "playerReady": {
          const d = msg.data as { playerId?: string; ready: boolean };
          setPlayers((ps) => ps.map((p) => (p.id === d.playerId ? { ...p, isReady: d.ready } : p)));
          break;
        }
        case "gameStart": {
          const d = msg.data as { tournamentState?: TournamentState };
          if (d.tournamentState) setTournament(d.tournamentState);
          setScores([0, 0]);
          setSeconds(0);
          setReadyDeadline(null);
          setRematchAsked(false);
          setRematchFrom(null);
          setRoundWinner(null);
          setReadyEndsAt(null);
          setPhase({ k: "countdown" });
          break;
        }
        case "spectatorCount":
          setWatchers(msg.data.count);
          break;
        case "gameState": {
          const gs = (msg.data as { gameState: GameState }).gameState;
          stateRef.current = gs;
          setScores((prev) => (prev[0] === gs.scores[0] && prev[1] === gs.scores[1] ? prev : [gs.scores[0] ?? 0, gs.scores[1] ?? 0]));
          setPhase((p) =>
            (p.k === "countdown" && gs.name === "PlayingState") || (p.k === "tournament" && tournamentRef.current?.phase === "playing") ? { k: "playing" } : p,
          );
          break;
        }
        case "tournamentState": {
          const st = msg.data.state;
          setTournament(st);
          setReadyEndsAt(st.readyDeadline ? Date.now() + Math.max(0, st.readyDeadline - msg.timestamp) : null);
          if (st.phase !== "playing") setOpponentAway(null);
          setPhase((p) => {
            if (p.k === "error") return p;
            // a live game: keep the court (players and watchers); a joiner mid-game waits for the first frame
            if (st.phase === "playing") return p.k === "countdown" || p.k === "playing" ? p : stateRef.current ? { k: "playing" } : { k: "tournament" };
            return { k: "tournament" };
          });
          break;
        }
        case "tournamentRoundEnd":
          setRoundWinner(msg.data.winner.name);
          break;
        case "tournamentEnd":
          // the final bracket state follows: the tournament screen shows the champion
          setPhase((p) => (p.k === "error" ? p : { k: "tournament" }));
          break;
        case "gameEnd": {
          const winner = (msg.data as { winner?: serializablePlayer }).winner;
          setPhase({ k: "ended", winnerId: winner?.id ?? null });
          break;
        }
        case "playerLeft": {
          const leaverId = (msg.data as { playerId?: string }).playerId;
          setPlayers((ps) => ps.filter((p) => p.id !== leaverId));
          // tournament: the server forfeits the leaver's match and sends the new bracket
          if (mode.startsWith("tournament") || tournamentRef.current) break;
          setPhase((p) => {
            if (p.k === "playing" || p.k === "countdown") {
              return { k: "ended", winnerId: myIdRef.current, reason: "left" };
            }
            if (p.k === "found") {
              // Before the game started: wait for someone else (tournament) or report it (1v1)
              return p.tournament ? { k: "waiting", roomId: p.roomId, tournament: true } : { k: "error", message: t("game.opponentLeft"), retry: true };
            }
            return p;
          });
          break;
        }
        case "opponentReconnecting": {
          const d = msg.data as { playerName: string; deadline: number };
          setOpponentAway({ name: d.playerName, deadline: d.deadline });
          break;
        }
        case "opponentReconnected":
          setOpponentAway(null);
          break;
        case "rejoined": {
          const d = msg.data as { playersInRoom: serializablePlayer[]; gameState: GameState | null };
          setPlayers(d.playersInRoom);
          if (d.gameState) stateRef.current = d.gameState;
          // tournament between games: the bracket state that follows picks the screen
          setPhase(d.gameState || !(mode.startsWith("tournament") || tournamentRef.current) ? { k: "playing" } : { k: "tournament" });
          break;
        }
        case "rematchRequested":
          setRematchFrom((msg.data as { playerName: string }).playerName);
          break;
        case "ratingUpdate":
          // ranked match: my new season rating (arrives a moment after gameEnd)
          setRatingChange(msg.data as RatingChange);
          break;
        case "rematchReady": {
          const d = msg.data as { roomId: string; playersInRoom: serializablePlayer[] };
          setPlayers(d.playersInRoom);
          setReadySent(false);
          setRematchAsked(false);
          setRematchFrom(null);
          setRatingChange(null);
          setOpponentAway(null);
          setReadyDeadline(Date.now() + 30_000);
          setPhase({ k: "found", roomId: d.roomId, tournament: false });
          break;
        }
        case "readyTimeout":
          setReadyDeadline(null);
          setPhase({ k: "error", message: t("matchmaking.readyTimeout"), retry: true });
          break;
        case "Error": {
          const c = (msg.data as { code?: string }).code;
          if (c === "JOIN_FAILED" || c === "ROOM_NOT_FOUND") setPhase({ k: "error", message: t("matchmaking.roomNotFound"), retry: false });
          break;
        }
      }
    });

    const pingTimer = setInterval(() => setPing(socket.pingMs), 2000);
    return () => {
      clearInterval(pingTimer);
      offNotify();
      offStatus();
      offMsg();
      socket.close();
      socketRef.current = null;
    };
  }, [mode, code, size, invite, t]);

  // ---- search clock + timeout
  useEffect(() => {
    if (phase.k !== "searching") return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - phase.since > SEARCH_TIMEOUT_MS) {
        socketRef.current?.send({ type: "leaveQueue", data: { playerName: "" } });
        setPhase({ k: "error", message: t("matchmaking.timeoutBody"), retry: true });
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, t]);

  // ---- 1s clock for the ready deadlines and the reconnect countdown
  useEffect(() => {
    if (!readyDeadline && !opponentAway && !readyEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [readyDeadline, opponentAway, readyEndsAt]);

  // ---- match clock
  useEffect(() => {
    if (phase.k !== "playing" || opponentAway) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase.k, opponentAway]);

  // ---- Esc: cancel search, or toggle the in-game menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phaseRef.current.k === "searching") cancel();
      else if (phaseRef.current.k === "playing") setMenu((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancel() {
    socketRef.current?.send({ type: "leaveQueue", data: { playerName: "" } });
    socketRef.current?.send({ type: "leaveRoom", data: { playerName: "" } });
    router.push(href("/lobby"));
  }

  const ready = () => {
    socketRef.current?.send({ type: "playerReady", data: { ready: true } });
    setReadySent(true);
  };
  const startTournament = () => socketRef.current?.send({ type: "startTournament", data: {} });

  const onInputs = useCallback((p1: PlayerInputs) => {
    socketRef.current?.send({ type: "playerInput", data: { inputs: p1 } });
  }, []);
  const getState = useCallback(() => stateRef.current, []);
  const onFirstMove = useCallback(() => {
    setShowControls(false);
    setPref("seenControls", true);
  }, [setPref]);
  const afterCountdown = useCallback(() => setPhase((p) => (p.k === "countdown" ? { k: "playing" } : p)), []);

  // Seat = server position (1-based): position 1 is the left paddle. In a tournament the
  // current bracket match says who plays (p1 left); names come from the bracket snapshot.
  const meP = players.find((p) => p.id === myId);
  const live = tournament ? currentMatch(tournament) : undefined;
  const leftId = tournament ? (live?.p1 ?? undefined) : players.find((p) => p.position === 1)?.id;
  const rightId = tournament ? (live?.p2 ?? undefined) : players.find((p) => p.position === 2)?.id;
  const person = (id: string | undefined) => {
    if (!id) return undefined;
    const p = players.find((x) => x.id === id) ?? tournament?.players.find((x) => x.id === id);
    return p ? { id, name: p.name, picture: p.picture, look: p.look } : undefined;
  };
  const left = person(leftId);
  const right = person(rightId);
  const leftSkin = left?.look?.paddle ?? "classic";
  const rightSkin = right?.look?.paddle ?? "classic";
  const skins = useMemo(() => [leftSkin, rightSkin] as const, [leftSkin, rightSkin]);
  const youSide: 0 | 1 | null = myId === leftId ? 0 : myId === rightId ? 1 : null;
  const spectating = youSide === null;

  // ---------------- render by phase ----------------
  if (phase.k === "error") {
    return (
      <Centered>
        <EmptyState
          icon={<AlertTriangle className="ico c-amber" aria-hidden />}
          title={phase.message === t("matchmaking.timeoutBody") ? t("matchmaking.timeout") : t("common.error")}
          body={phase.message}
          action={
            <div className="row wrap justify-center">
              {phase.retry && (
                <Button variant="primary" glow="sm" onClick={onRestart}>
                  {mode === "quick" ? t("matchmaking.searchAgain") : t("common.retry")}
                </Button>
              )}
              <Button asChild>
                <Link href={href("/lobby")} className="no-underline">
                  {t("common.backToLobby")}
                </Link>
              </Button>
            </div>
          }
        />
      </Centered>
    );
  }

  if (phase.k === "connecting") {
    return (
      <Centered>
        <Spinner large label={t("matchmaking.connecting")} />
        <p className="muted">{t("matchmaking.connecting")}</p>
      </Centered>
    );
  }

  if (phase.k === "tournament") {
    if (!tournament) {
      return (
        <Centered>
          <Spinner large label={t("matchmaking.connecting")} />
          <Button variant="ghost" onClick={cancel}>
            {t("common.cancel")}
          </Button>
        </Centered>
      );
    }
    return (
      <TournamentScreen
        state={tournament}
        myId={myId}
        remaining={readyEndsAt ? Math.max(0, Math.ceil((readyEndsAt - now) / 1000)) : null}
        roundWinner={roundWinner}
        onReady={ready}
        onStart={startTournament}
        onLeave={cancel}
        onNew={mode === "tournament-create" ? onRestart : undefined}
      />
    );
  }

  if (phase.k === "searching") {
    const elapsed = Math.floor((now - phase.since) / 1000);
    return (
      <Centered>
        <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden>
          <span className="pulse-ring absolute inset-0 rounded-full border border-neon-amber" />
          <span className="pulse-ring absolute inset-0 rounded-full border border-neon-amber [animation-delay:0.6s]" />
          <Avatar name={me?.displayName ?? "?"} src={me?.avatar} look={me?.look} size="lg" ring="you" />
        </div>
        <h1 className="t-title">{t("matchmaking.searching")}</h1>
        <p className="num num-lg c-amber glow-text-amber" role="timer" aria-live="off">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
        <p className="muted">{t("matchmaking.searchingBody")}</p>
        <Button onClick={cancel}>{t("common.cancel")}</Button>
      </Centered>
    );
  }

  if (phase.k === "waiting" || phase.k === "found") {
    const roomId = phase.roomId;
    const isTournament = phase.tournament;
    const canReady = phase.k === "found" || (isTournament && players.length >= 3);
    return (
      <Centered wide>
        {phase.k === "waiting" && (
          <Panel className="w-full max-w-[520px] text-center">
            <h1 className="t-title mb-2">{isTournament ? t("tournament.lobbyTitle") : t("matchmaking.waitingRoom")}</h1>
            <p className="muted mb-3">{t("matchmaking.shareCode")}</p>
            <InviteShare code={roomId} kind={isTournament ? "tournament" : "match"} />
            {isTournament && <p className="t-caption subtle mt-3">{t("tournament.players", { n: players.length, max: size })}</p>}
          </Panel>
        )}
        {phase.k === "found" && <h1 className="t-title">{t("matchmaking.found")}</h1>}
        <div className={isTournament ? "grid w-full max-w-[720px] gap-3 sm:grid-cols-2" : "flex w-full max-w-[720px] flex-col items-stretch gap-4 sm:flex-row sm:items-center"}>
          {players.map((p, i) => (
            <div key={p.id} className="contents">
              {!isTournament && i === 1 && <span className="pix pix-md self-center subtle">{t("match.vs")}</span>}
              <Panel className="flex-1">
                <div className="row !gap-3">
                  <Avatar name={p.name} src={p.picture} look={p.look} size="lg" ring={p.id === myId ? "you" : "opp"} />
                  <div className="min-w-0">
                    <p className="t-heading truncate">{p.name}</p>
                    {p.id === myId && <p className="t-caption subtle">{t("common.you")}</p>}
                    {p.isReady ? <Badge tone="green">{t("matchmaking.readyBadge")}</Badge> : <Badge>{t("matchmaking.notReady")}</Badge>}
                  </div>
                </div>
              </Panel>
            </div>
          ))}
        </div>
        {readyDeadline && phase.k === "found" && (
          <p className="num num-md c-amber" role="timer">
            {t("matchmaking.readyDeadline", { s: Math.max(0, Math.ceil((readyDeadline - now) / 1000)) })}
          </p>
        )}
        {canReady &&
          (readySent || meP?.isReady ? (
            <p className="muted row">
              <Spinner /> {t("matchmaking.waitingFor", { name: players.filter((p) => p.id !== myId && !p.isReady).map((p) => p.name).join(", ") || "…" })}
            </p>
          ) : (
            <Button variant="primary" glow="md" size="lg" onClick={ready}>
              {t("matchmaking.ready")}
            </Button>
          ))}
        <Button variant="ghost" onClick={cancel}>
          {t("common.cancel")}
        </Button>
      </Centered>
    );
  }

  if (phase.k === "ended") {
    const won = phase.winnerId !== null && phase.winnerId === myId;
    const winner = players.find((p) => p.id === phase.winnerId);
    return (
      <MatchEnd
        won={spectating ? null : won}
        title={spectating ? t("game.winner", { name: winner?.name ?? "?" }) : won ? t("game.youWin") : t("game.youLose")}
        scores={youSide === 1 ? [scores[1], scores[0]] : scores}
        replay={
          <Replay
            frames={lastPoint}
            config={config}
            youSide={spectating ? null : youSide}
            skins={skins}
            caption={{
              left: (youSide === 1 ? right?.name : left?.name) ?? "",
              right: (youSide === 1 ? left?.name : right?.name) ?? "",
              scores: youSide === 1 ? [scores[1], scores[0]] : scores,
            }}
          />
        }
        leftName={youSide === 1 ? (right?.name ?? "") : (left?.name ?? "")}
        rightName={youSide === 1 ? (left?.name ?? "") : (right?.name ?? "")}
        primary={
          !tournament && phase.reason !== "left" && players.length === 2 ? (
            <Button
              variant="primary"
              glow="md"
              size="lg"
              loading={rematchAsked}
              onClick={() => {
                socketRef.current?.send({ type: "rematch", data: {} });
                setRematchAsked(true);
              }}
            >
              {rematchAsked ? t("game.rematchWaiting", { name: players.find((p) => p.id !== myId)?.name ?? "…" }) : t("game.rematch")}
            </Button>
          ) : (
            <Button variant="primary" glow="md" size="lg" onClick={onRestart}>
              {t("game.playAgain")}
            </Button>
          )
        }
        secondary={
          <Button asChild size="lg">
            <Link href={href("/lobby")} className="no-underline">
              {t("common.backToLobby")}
            </Link>
          </Button>
        }
        note={
          <>
            {ratingChange && !spectating && <RatingChangeLine change={ratingChange} />}
            {phase.reason === "left" ? (
            <p className="muted">{t("game.opponentLeft")}</p>
          ) : rematchFrom && !rematchAsked ? (
            <p className="c-cyan" role="status">
              {t("game.rematchRequested", { name: rematchFrom })}
            </p>
          ) : null}
          </>
        }
      />
    );
  }

  // countdown / playing
  const ordered = youSide === 1 ? [right, left] : [left, right];
  const shownScores: [number, number] = youSide === 1 ? [scores[1], scores[0]] : scores;
  return (
    <div className="flex h-dvh flex-col">
      <ScoreBoard
        left={{ name: ordered[0]?.name ?? "…", avatar: ordered[0]?.picture, look: ordered[0]?.look }}
        right={{ name: ordered[1]?.name ?? "…", avatar: ordered[1]?.picture, look: ordered[1]?.look }}
        scores={shownScores}
        seconds={seconds}
        leftIsYou={!spectating}
        mode={
          tournament ? (
            <span className="row !gap-2">
              <Trophy className="ico !h-4 !w-4 c-amber" aria-hidden />
              {live ? roundName(t, live.round, tournament.rounds.length) : t("tournament.title")}
              {watchers > 0 && (
                <span className="row !gap-1" aria-label={t("watch.spectators", { n: watchers })}>
                  <Eye className="ico !h-4 !w-4" aria-hidden />
                  {watchers}
                </span>
              )}
            </span>
          ) : (
            <span className="row !gap-2">
              {t("lobby.quickMatch")}
              {watchers > 0 && (
                <span className="row !gap-1" aria-label={t("watch.spectators", { n: watchers })}>
                  <Eye className="ico !h-4 !w-4" aria-hidden />
                  {watchers}
                </span>
              )}
            </span>
          )
        }
        connection={<ConnectionQuality ms={ping} offline={status !== "connected"} />}
        onMenu={() => setMenu(true)}
      />
      <div className="relative flex-1 p-4">
        <Court
          config={config}
          getState={getState}
          youSide={youSide}
          controls="online"
          onInputs={onInputs}
          paused={phase.k !== "playing" || spectating || !!opponentAway}
          onFirstMove={onFirstMove}
          skins={skins}
          onPoint={setLastPoint}
        />
        {phase.k === "countdown" && <CountdownOverlay onDone={afterCountdown} />}
        {phase.k === "playing" && showControls && !spectating && <ControlsCard local={false} onClose={onFirstMove} />}
        {status === "reconnecting" && <ReconnectingOverlay onRetry={() => socketRef.current?.retry()} />}
        {opponentAway && status === "connected" && (
          <div className="overlay">
            <div className="reconnect" role="status" aria-live="assertive">
              <span className="spinner spinner-lg" aria-hidden />
              <p className="t-heading">{t("game.opponentReconnecting", { name: opponentAway.name })}</p>
              <p className="pix pix-md c-amber glow-text-amber">{Math.max(0, Math.ceil((opponentAway.deadline - now) / 1000))}</p>
              <div className="meter" aria-hidden>
                <i style={{ width: `${Math.max(0, Math.min(100, ((opponentAway.deadline - now) / 15000) * 100))}%` }} />
              </div>
              <p className="t-caption subtle">{t("game.reconnectOutcome", { s: Math.max(0, Math.ceil((opponentAway.deadline - now) / 1000)) })}</p>
            </div>
          </div>
        )}
      </div>
      {tournament && spectating && (
        <>
          <div className="fixed right-4 bottom-4 z-10">
            <Button size="sm" onClick={() => setBracketOpen(true)}>
              <Trophy className="ico" aria-hidden /> {t("tournament.bracket")}
            </Button>
          </div>
          <Modal open={bracketOpen} onOpenChange={setBracketOpen} title={t("tournament.bracket")}>
            <div className="mt-4 max-h-[70dvh] overflow-y-auto">
              <BracketView state={tournament} myId={myId} />
            </div>
          </Modal>
        </>
      )}
      <GameMenu
        open={menu}
        onOpenChange={setMenu}
        online
        onShowControls={() => {
          setMenu(false);
          setShowControls(true);
        }}
        {...(tournament && spectating
          ? { forfeitLabel: t("tournament.leave"), confirmTitle: t("tournament.leaveConfirm"), confirmBody: t("tournament.leaveHint") }
          : {})}
        onForfeit={() => {
          // a watcher leaves the tournament; a player loses this match and stays to watch
          if (tournament && spectating) return cancel();
          // the server records the loss and answers with gameEnd (1v1) or the new bracket
          socketRef.current?.send({ type: "forfeit", data: {} });
        }}
      />
    </div>
  );
}

function Centered({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={"flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-10 text-center " + (wide ? "" : "")}>{children}</div>;
}

function TournamentScreen({
  state,
  myId,
  remaining,
  roundWinner,
  onReady,
  onStart,
  onLeave,
  onNew,
}: {
  state: TournamentState;
  myId: string | null;
  remaining: number | null;
  roundWinner: string | null;
  onReady: () => void;
  onStart: () => void;
  onLeave: () => void;
  /** only the creator can open a fresh tournament (a joiner has no new code to join) */
  onNew?: (() => void) | undefined;
}) {
  const { t, href } = useI18n();
  const nameOf = (id: string | null) => state.players.find((p) => p.id === id)?.name ?? "?";
  const live = currentMatch(state);
  const inLive = !!myId && !!live && (live.p1 === myId || live.p2 === myId);
  const out = myId ? isOut(state, myId) : false;
  const mine = myId ? nextMatchOf(state, myId) : undefined;
  const opponent = mine ? (mine.p1 === myId ? mine.p2 : mine.p1) : null;
  const isHost = state.hostId === myId;
  const iAmReady = !!myId && state.readyIds.includes(myId);

  if (state.phase === "registration") {
    const enough = state.players.length >= 3;
    const open = Math.max(0, state.size - state.players.length);
    return (
      <Centered wide>
        <Panel className="w-full max-w-[520px] text-center">
          <h1 className="t-title mb-2">{t("tournament.lobbyTitle")}</h1>
          <p className="muted mb-3">{t("matchmaking.shareCode")}</p>
          <InviteShare code={state.roomId} kind="tournament" />
          <p className="t-caption subtle mt-3" aria-live="polite">
            {t("tournament.players", { n: state.players.length, max: state.size })}
          </p>
        </Panel>
        <ul className="grid w-full max-w-[720px] gap-3 sm:grid-cols-2" aria-label={t("tournament.registered")}>
          {state.players.map((p) => (
            <li key={p.id}>
              <Panel>
                <div className="row !gap-3">
                  <Avatar name={p.name} src={p.picture} look={p.look} size="md" ring={p.id === myId ? "you" : "opp"} />
                  <div className="min-w-0">
                    <p className="t-heading truncate">{p.name}</p>
                    <p className="t-caption subtle">
                      {[p.id === myId ? t("common.you") : null, p.id === state.hostId ? t("tournament.host") : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </Panel>
            </li>
          ))}
          {Array.from({ length: open }, (_, i) => (
            <li key={`open-${i}`}>
              <Panel className="border-dashed">
                <p className="muted">{t("tournament.openSlot")}</p>
              </Panel>
            </li>
          ))}
        </ul>
        <section className="w-full max-w-[960px] text-left" aria-labelledby="bk-heading">
          <h2 className="t-heading mb-2" id="bk-heading">
            {t("tournament.bracket")}
          </h2>
          <p className="t-caption subtle mb-4">{t("tournament.seedingNote")}</p>
          <BracketView state={state} myId={myId} preview />
        </section>
        {isHost ? (
          <div className="stack items-center">
            <Button variant="primary" glow="md" size="lg" disabled={!enough} onClick={onStart}>
              {t("tournament.start")}
            </Button>
            <p className="t-caption subtle">{enough ? t("tournament.startHint", { max: state.size }) : t("tournament.needMore", { n: 3 })}</p>
          </div>
        ) : (
          <p className="muted row">
            <Spinner /> {t("tournament.waitingHost")}
          </p>
        )}
        <Button variant="ghost" onClick={onLeave}>
          {t("common.cancel")}
        </Button>
      </Centered>
    );
  }

  // ---- bracket in progress or finished
  let headline: React.ReactNode;
  if (state.phase === "finished") {
    headline = <ChampionBanner state={state} myId={myId} />;
  } else {
    const liveLabel = live ? `${roundName(t, live.round, state.rounds.length)} · ${nameOf(live.p1)} ${t("match.vs")} ${nameOf(live.p2)}` : null;
    headline = (
      <div className="stack items-center text-center" aria-live="polite">
        {state.phase === "between" && roundWinner && <p className="t-heading c-green">{t("tournament.matchWon", { name: roundWinner })}</p>}
        {out ? (
          <>
            <Badge tone="red">{t("tournament.eliminated")}</Badge>
            <p className="muted">{t("tournament.eliminatedBody")}</p>
          </>
        ) : inLive ? (
          <h1 className="t-title">{t("tournament.yourMatchVs", { name: nameOf(live!.p1 === myId ? live!.p2 : live!.p1) })}</h1>
        ) : mine ? (
          <h1 className="t-title">{opponent ? t("tournament.yourNextMatch", { name: nameOf(opponent) }) : t("tournament.yourNextMatchTbd")}</h1>
        ) : null}
        {state.phase === "ready" && liveLabel && !inLive && <p className="muted">{t("tournament.upNext", { match: liveLabel })}</p>}
        {state.phase === "between" && <p className="muted row"><Spinner /> {t("tournament.nextSoon")}</p>}
      </div>
    );
  }

  return (
    <Centered wide>
      {headline}
      {state.phase === "ready" && live && (
        <div className="stack items-center">
          {inLive ? (
            iAmReady ? (
              <p className="muted row">
                <Spinner /> {t("matchmaking.waitingFor", { name: nameOf(live.p1 === myId ? live.p2 : live.p1) })}
              </p>
            ) : (
              <Button variant="primary" glow="md" size="lg" onClick={onReady}>
                {t("matchmaking.ready")}
              </Button>
            )
          ) : (
            <p className="muted">{t("tournament.waitingReady", { n: state.readyIds.length })}</p>
          )}
          {remaining !== null && (
            <p className="num num-md c-amber" role="timer">
              {inLive && !iAmReady ? t("tournament.readyOrForfeit", { s: remaining }) : t("matchmaking.readyDeadline", { s: remaining })}
            </p>
          )}
        </div>
      )}
      <section className="w-full max-w-[960px] text-left" aria-labelledby="bk-heading">
        <h2 className="t-heading mb-4" id="bk-heading">
          {t("tournament.bracket")}
        </h2>
        <BracketView state={state} myId={myId} />
      </section>
      <div className="row wrap justify-center">
        {state.phase === "finished" ? (
          <>
            {onNew && (
              <Button variant="primary" glow="sm" onClick={onNew}>
                {t("tournament.newTournament")}
              </Button>
            )}
            <Button asChild>
              <Link href={href("/lobby")} className="no-underline">
                {t("common.backToLobby")}
              </Link>
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onLeave}>
            {t("tournament.leave")}
          </Button>
        )}
      </div>
      {state.phase !== "finished" && !out && <p className="t-caption subtle">{t("tournament.leaveHint")}</p>}
    </Centered>
  );
}

type RatingChange = { rating: number; delta: number; games: number; division: Division | null };

/** "+14 · 1580 · Gold" after a ranked match (placement shows how many games are left) */
function RatingChangeLine({ change }: { change: RatingChange }) {
  const { t } = useI18n();
  const up = change.delta >= 0;
  return (
    <p className="row wrap justify-center !gap-2" role="status">
      <span className={cn("num num-md", up ? "c-green" : "c-red")}>
        {up ? "+" : "−"}
        <TickNumber value={Math.abs(change.delta)} />
      </span>
      <span className="muted">
        {t("ranked.rating")} <span className="num">{change.rating}</span>
      </span>
      <DivisionBadge division={change.division} placementLeft={Math.max(0, PLACEMENT_GAMES - change.games)} />
    </p>
  );
}
