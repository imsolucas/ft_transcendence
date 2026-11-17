"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, Crown, Users } from "lucide-react";
import type { GameState, PlayerInputs, serializablePlayer, TournamentState } from "shared";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "@/lib/session";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePrefs } from "@/lib/prefs";
import { GameSocket, type ConnectionStatus, type ServerMessage } from "@/lib/game/socket";
import { baseGameConfig } from "@/lib/game/config";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Panel, Spinner } from "@/components/ui/primitives";
import { Court } from "@/components/game/court";
import { ConnectionQuality, ControlsCard, CountdownOverlay, GameMenu, MatchEnd, ReconnectingOverlay, ScoreBoard } from "@/components/game/hud";

export type PlayMode = "quick" | "create" | "join" | "tournament-create" | "tournament-join";

type Phase =
  | { k: "connecting" }
  | { k: "searching"; since: number }
  | { k: "waiting"; roomId: string; tournament: boolean }
  | { k: "found"; roomId: string; tournament: boolean }
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
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [seconds, setSeconds] = useState(0);
  const [menu, setMenu] = useState(false);
  const [showControls, setShowControls] = useState(!prefs.seenControls);
  const [ping, setPing] = useState<number | undefined>();
  const [tournament, setTournament] = useState<TournamentState | null>(null);
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

  const myId = me ? String(me.id) : null;
  const invitedRef = useRef(false);
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  // ---- socket lifecycle
  useEffect(() => {
    const socket = new GameSocket();
    socketRef.current = socket;

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
          setPhase({ k: "countdown" });
          break;
        }
        case "gameState": {
          const gs = (msg.data as { gameState: GameState }).gameState;
          stateRef.current = gs;
          setScores((prev) => (prev[0] === gs.scores[0] && prev[1] === gs.scores[1] ? prev : [gs.scores[0] ?? 0, gs.scores[1] ?? 0]));
          setPhase((p) => (p.k === "countdown" && gs.name === "PlayingState" ? { k: "playing" } : p));
          break;
        }
        case "tournamentState":
          setTournament((msg.data as { state: TournamentState }).state);
          break;
        case "tournamentRoundEnd":
          break;
        case "gameEnd":
        case "tournamentEnd": {
          const winner = (msg.data as { winner?: serializablePlayer }).winner;
          setPhase({ k: "ended", winnerId: winner?.id ?? null });
          break;
        }
        case "playerLeft": {
          setPhase((p) => (p.k === "playing" || p.k === "countdown" || p.k === "found" ? { k: "ended", winnerId: myIdRef.current, reason: "left" } : p));
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
          setPhase({ k: "playing" });
          break;
        }
        case "rematchRequested":
          setRematchFrom((msg.data as { playerName: string }).playerName);
          break;
        case "rematchReady": {
          const d = msg.data as { roomId: string; playersInRoom: serializablePlayer[] };
          setPlayers(d.playersInRoom);
          setReadySent(false);
          setRematchAsked(false);
          setRematchFrom(null);
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

  // ---- 1s clock for the ready deadline and the reconnect countdown
  useEffect(() => {
    if (!readyDeadline && !opponentAway) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [readyDeadline, opponentAway]);

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

  const onInputs = useCallback((p1: PlayerInputs) => {
    socketRef.current?.send({ type: "playerInput", data: { inputs: p1 } });
  }, []);
  const getState = useCallback(() => stateRef.current, []);
  const onFirstMove = useCallback(() => {
    setShowControls(false);
    setPref("seenControls", true);
  }, [setPref]);
  const afterCountdown = useCallback(() => setPhase((p) => (p.k === "countdown" ? { k: "playing" } : p)), []);

  // Seat = server position (1-based): position 1 is the left paddle
  const meP = players.find((p) => p.id === myId);
  const tournamentPair = tournament ? [tournament.kingId, tournament.challengerId] : null;
  const leftId = tournamentPair ? tournamentPair[0] : players.find((p) => p.position === 1)?.id;
  const rightId = tournamentPair ? tournamentPair[1] : players.find((p) => p.position === 2)?.id;
  const left = players.find((p) => p.id === leftId);
  const right = players.find((p) => p.id === rightId);
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

  if (phase.k === "searching") {
    const elapsed = Math.floor((now - phase.since) / 1000);
    return (
      <Centered>
        <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden>
          <span className="pulse-ring absolute inset-0 rounded-full border border-neon-amber" />
          <span className="pulse-ring absolute inset-0 rounded-full border border-neon-amber [animation-delay:0.6s]" />
          <Avatar name={me?.displayName ?? "?"} src={me?.avatar} size="lg" ring="you" />
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
            <div className="row justify-center">
              <span className="num num-lg tracking-widest" aria-label={roomId.split("").join(" ")}>
                {roomId.toUpperCase()}
              </span>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(roomId.toUpperCase())}>
                <Copy className="ico" aria-hidden /> {t("common.copy")}
              </Button>
            </div>
            {isTournament && <p className="t-caption subtle mt-3">{t("tournament.players", { n: players.length, max: size })}</p>}
          </Panel>
        )}
        {phase.k === "found" && <h1 className="t-title">{t("matchmaking.found")}</h1>}
        <div className={isTournament ? "grid w-full max-w-[720px] gap-3 sm:grid-cols-2" : "flex w-full max-w-[720px] flex-col items-stretch gap-4 sm:flex-row sm:items-center"}>
          {players.map((p, i) => (
            <div key={p.id} className="contents">
              {!isTournament && i === 1 && <span className="pix pix-md self-center subtle">{t("match.vs")}</span>}
              <Panel className="flex-1">
                <div className="row row-3">
                  <Avatar name={p.name} src={p.picture} size="lg" ring={p.id === myId ? "you" : "opp"} />
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
          phase.reason === "left" ? (
            <p className="muted">{t("game.opponentLeft")}</p>
          ) : rematchFrom && !rematchAsked ? (
            <p className="c-cyan" role="status">
              {t("game.rematchRequested", { name: rematchFrom })}
            </p>
          ) : null
        }
      />
    );
  }

  // countdown / playing
  const ordered: [serializablePlayer | undefined, serializablePlayer | undefined] = youSide === 1 ? [right, left] : [left, right];
  const shownScores: [number, number] = youSide === 1 ? [scores[1], scores[0]] : scores;
  return (
    <div className="flex h-dvh flex-col">
      <ScoreBoard
        left={{ name: ordered[0]?.name ?? "…", avatar: ordered[0]?.picture }}
        right={{ name: ordered[1]?.name ?? "…", avatar: ordered[1]?.picture }}
        scores={shownScores}
        seconds={seconds}
        leftIsYou={!spectating}
        mode={
          tournament ? (
            <span className="row">
              <Crown className="ico !h-4 !w-4 c-amber" aria-hidden />
              {t("tournament.title")}
              <Users className="ico !h-4 !w-4" aria-hidden />
              {tournament.queue.length}
            </span>
          ) : (
            t("lobby.quickMatch")
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
      <GameMenu
        open={menu}
        onOpenChange={setMenu}
        online
        onShowControls={() => {
          setMenu(false);
          setShowControls(true);
        }}
        onForfeit={() => {
          // the server records the loss and answers with gameEnd
          socketRef.current?.send({ type: tournament ? "leaveRoom" : "forfeit", data: {} });
          if (tournament) setPhase({ k: "ended", winnerId: null });
        }}
      />
    </div>
  );
}

function Centered({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={"flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-10 text-center " + (wide ? "" : "")}>{children}</div>;
}
