"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Copy, Crown, Eye, Users } from "lucide-react";
import type { PartyPlayer, PartySide, PartyStanding, PartyState, serializablePlayer } from "shared";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "@/lib/session";
import { announceAchievement, announceLevelUp } from "@/lib/realtime";
import { GameSocket, type ConnectionStatus, type ServerMessage } from "@/lib/game/socket";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Panel, Spinner } from "@/components/ui/primitives";
import { ConnectionQuality, GameMenu, ReconnectingOverlay } from "@/components/game/hud";
import { PartyCourt, PartyRoster, type PartyDir } from "@/components/game/party";

export type PartyMode = "quick" | "create" | "join";

type Phase =
  | { k: "connecting" }
  | { k: "searching"; since: number }
  | { k: "lobby"; roomId: string }
  | { k: "playing" }
  | { k: "ended"; winner: { id: string; name: string } | null; standings: PartyStanding[] }
  | { k: "error"; message: string; retry: boolean };

const SEARCH_TIMEOUT_MS = 120_000;
const READY_MS = 30_000;
const idle = { up: false, down: false, left: false, right: false, action_1: false, action_2: false };

export function PartyView() {
  const params = useSearchParams();
  const raw = params.get("mode");
  const mode: PartyMode = raw === "create" || raw === "join" ? raw : "quick";
  const code = params.get("code") ?? "";
  const [attempt, setAttempt] = useState(0);
  return <PartyMatch key={`${mode}-${code}-${attempt}`} mode={mode} code={code} onRestart={() => setAttempt((a) => a + 1)} />;
}

function PartyMatch({ mode, code, onRestart }: { mode: PartyMode; code: string; onRestart: () => void }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const { me } = useMe();
  const myId = me ? String(me.id) : null;
  const socketRef = useRef<GameSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [phase, setPhase] = useState<Phase>({ k: "connecting" });
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const [lobby, setLobby] = useState<serializablePlayer[]>([]);
  const [readySent, setReadySent] = useState(false);
  const [readyDeadline, setReadyDeadline] = useState<number | null>(null);
  const [queue, setQueue] = useState<{ waiting: number; startsAt: number | null }>({ waiting: 1, startsAt: null });
  const [seats, setSeats] = useState<PartyPlayer[]>([]);
  // roster view of the state: re-rendered only when lives / alive / phase change
  const [roster, setRoster] = useState<PartyState | null>(null);
  const stateRef = useRef<PartyState | null>(null);
  const [away, setAway] = useState<Record<string, { name: string; deadline: number }>>({});
  const [watchers, setWatchers] = useState(0);
  const [menu, setMenu] = useState(false);
  const [ping, setPing] = useState<number>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const socket = new GameSocket();
    socketRef.current = socket;
    const offNotify = socket.onNotify((e) => {
      if (e.type === "achievement") announceAchievement(e.id, t);
      else if (e.type === "levelUp") announceLevelUp(e.level, t);
    });
    const offStatus = socket.onStatus((s, error) => {
      setStatus(s);
      if (s === "disconnected" && phaseRef.current.k !== "ended") {
        const message = error === "UNAUTHORIZED" ? t("auth.sessionExpiredBody") : error === "TOO_MANY_CONNECTIONS" ? t("matchmaking.alreadyConnected") : t("matchmaking.disconnected");
        setPhase({ k: "error", message, retry: error !== "UNAUTHORIZED" });
      }
    });
    const rosterKey = (s: PartyState | null) => (s ? `${s.phase}|${s.paddles.map((p) => `${p.lives}${p.alive ? 1 : 0}`).join(",")}|${Math.ceil(s.serveIn)}` : "");

    const offMsg = socket.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case "connectionSuccess": {
          const k = phaseRef.current.k;
          if (k === "playing") {
            setPhase({ k: "error", message: t("party.droppedOut"), retry: true });
            break;
          }
          if (k === "lobby") {
            setPhase({ k: "error", message: t("matchmaking.disconnected"), retry: true });
            break;
          }
          if (mode === "quick") {
            socket.send({ type: "joinQueue", data: { roomType: "party" } });
            if (k !== "searching") setPhase({ k: "searching", since: Date.now() });
          } else if (mode === "create") {
            // the server builds the room config itself; only the mode is read
            socket.send({ type: "createRoom", data: { config: { mode: "party", isPrivate: true } } });
          } else {
            socket.send({ type: "joinRoom", data: { roomId: code.trim().toLowerCase(), mode: "party" } });
          }
          break;
        }
        case "connectionError":
          setPhase({ k: "error", message: msg.data.code === "ALREADY_CONNECTED" ? t("matchmaking.alreadyConnected") : t("matchmaking.disconnected"), retry: true });
          break;
        case "partyQueue":
          setQueue({ waiting: msg.data.waiting, startsAt: msg.data.startsAt });
          break;
        case "playerJoined":
          setLobby(msg.data.playersInRoom);
          setPhase((p) => {
            if (p.k === "playing" || p.k === "ended") return p;
            // a matchmade party has a ready deadline (a private one waits for friends)
            if (p.k === "searching") setReadyDeadline(Date.now() + READY_MS);
            return { k: "lobby", roomId: msg.data.roomId };
          });
          break;
        case "playerReady": {
          const d = msg.data;
          setLobby((ps) => ps.map((p) => (p.id === d.playerId ? { ...p, isReady: d.ready } : p)));
          break;
        }
        case "playerLeft": {
          const id = msg.data.playerId;
          setLobby((ps) => ps.filter((p) => p.id !== id));
          setAway((a) => {
            if (!(id in a)) return a;
            const next = { ...a };
            delete next[id];
            return next;
          });
          break;
        }
        case "partyStart":
          setSeats(msg.data.players);
          stateRef.current = msg.data.state;
          setRoster(msg.data.state);
          setReadyDeadline(null);
          setPhase({ k: "playing" });
          break;
        case "partyState": {
          const prev = stateRef.current;
          stateRef.current = msg.data.state;
          if (rosterKey(prev) !== rosterKey(msg.data.state)) setRoster(msg.data.state);
          break;
        }
        case "partyEnd":
          setAway({});
          setPhase({ k: "ended", winner: msg.data.winner, standings: msg.data.standings });
          break;
        case "rejoined":
          // the partyStart that follows puts the court back
          setLobby(msg.data.playersInRoom);
          break;
        case "opponentReconnecting": {
          const d = msg.data;
          setAway((a) => ({ ...a, [d.playerId]: { name: d.playerName, deadline: d.deadline } }));
          break;
        }
        case "opponentReconnected": {
          const id = msg.data.playerId;
          setAway((a) => {
            const next = { ...a };
            delete next[id];
            return next;
          });
          break;
        }
        case "spectatorCount":
          setWatchers(msg.data.count);
          break;
        case "readyTimeout":
          setReadyDeadline(null);
          setPhase({ k: "error", message: t("matchmaking.readyTimeout"), retry: true });
          break;
        case "Error": {
          const c = msg.data.code;
          if (c === "JOIN_FAILED" || c === "ROOM_NOT_FOUND") setPhase({ k: "error", message: t("party.roomNotFound"), retry: false });
          else if (c === "ALREADY_IN_ROOM") setPhase({ k: "error", message: t("matchmaking.alreadyConnected"), retry: true });
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
  }, [mode, code, t]);

  // clock for the queue countdown, ready deadline, reconnect countdowns and search timeout
  const ticking = phase.k === "searching" || readyDeadline !== null || Object.keys(away).length > 0;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [ticking]);
  useEffect(() => {
    if (phase.k !== "searching") return;
    const since = phase.since;
    const id = setInterval(() => {
      if (Date.now() - since < SEARCH_TIMEOUT_MS) return;
      socketRef.current?.send({ type: "leaveQueue", data: { playerName: "" } });
      setPhase({ k: "error", message: t("party.timeoutBody"), retry: true });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, t]);

  // Esc: cancel the search, or open the menu in game
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phaseRef.current.k === "searching") leave();
      else if (phaseRef.current.k === "playing") setMenu((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function leave() {
    socketRef.current?.send({ type: "leaveQueue", data: { playerName: "" } });
    socketRef.current?.send({ type: "leaveRoom", data: { playerName: "" } });
    router.push(href("/lobby"));
  }

  const onInputs = useCallback((d: PartyDir) => {
    socketRef.current?.send({ type: "playerInput", data: { inputs: { ...idle, left: d.left, right: d.right } } });
  }, []);
  const getState = useCallback(() => stateRef.current, []);

  const mySeat = seats.find((s) => s.id === myId)?.seat ?? null;
  const viewSide = (roster?.paddles[mySeat ?? 0]?.side ?? 0) as PartySide;
  const meAlive = mySeat !== null && roster?.paddles[mySeat]?.alive === true;

  // ---------------- render by phase ----------------
  if (phase.k === "error") {
    return (
      <Centered>
        <EmptyState
          icon={<AlertTriangle className="ico c-amber" aria-hidden />}
          title={t("common.error")}
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
    const startsIn = queue.startsAt ? Math.max(0, Math.ceil((queue.startsAt - now) / 1000)) : null;
    return (
      <Centered>
        <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden>
          <span className="pulse-ring absolute inset-0 rounded-full border border-neon-amber" />
          <span className="pulse-ring absolute inset-0 rounded-full border border-neon-amber [animation-delay:0.6s]" />
          <Users className="ico !h-10 !w-10 c-magenta" />
        </div>
        <h1 className="t-title">{t("party.searching")}</h1>
        <p className="num num-lg c-amber" aria-live="polite">
          {t("party.queueCount", { n: queue.waiting, max: 4 })}
        </p>
        <p className="muted" aria-live="polite">
          {startsIn !== null ? t("party.startsIn", { s: startsIn }) : t("party.searchingBody")}
        </p>
        <Button onClick={leave}>{t("common.cancel")}</Button>
      </Centered>
    );
  }

  if (phase.k === "lobby") {
    const enough = lobby.length >= 3;
    const meReady = readySent || lobby.find((p) => p.id === myId)?.isReady;
    const open = Math.max(0, 4 - lobby.length);
    return (
      <Centered>
        {mode !== "quick" ? (
          <Panel className="w-full max-w-[520px] text-center">
            <h1 className="t-title mb-2">{t("party.lobbyTitle")}</h1>
            <p className="muted mb-3">{t("party.shareCode")}</p>
            <div className="row justify-center">
              <span className="num num-lg tracking-widest" aria-label={phase.roomId.split("").join(" ")}>
                {phase.roomId.toUpperCase()}
              </span>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(phase.roomId.toUpperCase())}>
                <Copy className="ico" aria-hidden /> {t("common.copy")}
              </Button>
            </div>
          </Panel>
        ) : (
          <h1 className="t-title">{t("party.found")}</h1>
        )}
        <p className="t-caption subtle" aria-live="polite">
          {t("party.lobbyCount", { n: lobby.length, max: 4 })}
        </p>
        <ul className="grid w-full max-w-[720px] gap-3 sm:grid-cols-2">
          {lobby.map((p) => (
            <li key={p.id}>
              <Panel>
                <div className="row !gap-3">
                  <Avatar name={p.name} src={p.picture} look={p.look} size="lg" ring={p.id === myId ? "you" : "opp"} />
                  <div className="min-w-0">
                    <p className="t-heading truncate">{p.name}</p>
                    {p.id === myId && <p className="t-caption subtle">{t("common.you")}</p>}
                    {p.isReady ? <Badge tone="green">{t("matchmaking.readyBadge")}</Badge> : <Badge>{t("matchmaking.notReady")}</Badge>}
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
        {readyDeadline && (
          <p className="num num-md c-amber" role="timer">
            {t("matchmaking.readyDeadline", { s: Math.max(0, Math.ceil((readyDeadline - now) / 1000)) })}
          </p>
        )}
        {!enough ? (
          <p className="muted row">
            <Spinner /> {t("party.needMore", { n: 3 })}
          </p>
        ) : meReady ? (
          <p className="muted row">
            <Spinner /> {t("matchmaking.waitingFor", { name: lobby.filter((p) => p.id !== myId && !p.isReady).map((p) => p.name).join(", ") || "…" })}
          </p>
        ) : (
          <Button
            variant="primary"
            glow="md"
            size="lg"
            onClick={() => {
              socketRef.current?.send({ type: "playerReady", data: { ready: true } });
              setReadySent(true);
            }}
          >
            {t("matchmaking.ready")}
          </Button>
        )}
        {enough && <p className="t-caption subtle">{t("party.readyHint")}</p>}
        <Button variant="ghost" onClick={leave}>
          {t("common.cancel")}
        </Button>
      </Centered>
    );
  }

  if (phase.k === "ended") {
    const won = phase.winner?.id === myId;
    return (
      <Centered>
        <Crown className="ico !h-10 !w-10 c-amber" aria-hidden />
        <h1 className={won ? "t-title c-magenta glow-text-magenta" : "t-title"} role="status">
          {won ? t("game.youWin") : phase.winner ? t("game.winner", { name: phase.winner.name }) : t("party.noWinner")}
        </h1>
        <Panel className="w-full max-w-[520px]" title={t("party.standings")}>
          <ol className="stack">
            {phase.standings.map((s) => (
              <li key={s.id} className="list-row">
                <span className="num num-md w-8 text-center" aria-label={t("party.place", { n: s.place })}>
                  {s.place}
                </span>
                <span aria-hidden className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: `var(--party-seat-${s.seat})` }} />
                <span className="grow truncate t-strong">
                  {s.name}
                  {s.id === myId && <span className="subtle"> · {t("common.you")}</span>}
                </span>
                {s.place === 1 ? <Badge tone="amber">{t("party.winnerBadge")}</Badge> : <span className="t-caption subtle">{t("party.out")}</span>}
              </li>
            ))}
          </ol>
        </Panel>
        <div className="row wrap justify-center">
          <Button variant="primary" glow="md" size="lg" onClick={onRestart}>
            {mode === "join" ? t("common.retry") : t("game.playAgain")}
          </Button>
          <Button asChild size="lg">
            <Link href={href("/lobby")} className="no-underline">
              {t("common.backToLobby")}
            </Link>
          </Button>
        </div>
      </Centered>
    );
  }

  // playing
  const serving = roster?.phase === "serving";
  const awayList = Object.entries(away);
  return (
    <div className="flex h-dvh flex-col gap-3 p-3 md:p-4">
      <div className="row justify-between">
        <span className="row !gap-2 t-label">
          <Users className="ico c-magenta" aria-hidden />
          {t("party.title")}
          {watchers > 0 && (
            <span className="row !gap-1" aria-label={t("watch.spectators", { n: watchers })}>
              <Eye className="ico !h-4 !w-4" aria-hidden />
              {watchers}
            </span>
          )}
        </span>
        <span className="row">
          <ConnectionQuality ms={ping} offline={status !== "connected"} />
          <Button size="sm" variant="ghost" onClick={() => setMenu(true)}>
            {t("game.menu")}
          </Button>
        </span>
      </div>
      <PartyRoster players={seats} state={roster} myId={myId} viewSide={viewSide} />
      <div className="relative min-h-0 flex-1">
        <PartyCourt getState={getState} viewSide={viewSide} you={mySeat} controls={meAlive ? "online" : "none"} onInputs={onInputs} paused={!meAlive || awayList.length > 0} />
        {serving && roster && roster.serveIn > 0 && awayList.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-2 text-center" aria-live="polite">
            <span className="pix pix-md c-amber">{Math.ceil(roster.serveIn)}</span>
          </div>
        )}
        {!meAlive && mySeat !== null && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
            <Badge tone="red">{t("party.youreOut")}</Badge>
          </div>
        )}
        {status === "reconnecting" && <ReconnectingOverlay onRetry={() => socketRef.current?.retry()} />}
        {awayList.length > 0 && status === "connected" && (
          <div className="overlay">
            <div className="reconnect" role="status" aria-live="assertive">
              <span className="spinner spinner-lg" aria-hidden />
              {awayList.map(([id, a]) => (
                <p key={id} className="t-heading">
                  {t("game.opponentReconnecting", { name: a.name })} <span className="num c-amber">{Math.max(0, Math.ceil((a.deadline - now) / 1000))}</span>
                </p>
              ))}
              <p className="t-caption subtle">{t("party.reconnectOutcome")}</p>
            </div>
          </div>
        )}
      </div>
      <p className="t-caption subtle text-center max-md:hidden">{t("party.keys")}</p>
      <GameMenu
        open={menu}
        onOpenChange={setMenu}
        online
        onShowControls={() => setMenu(false)}
        {...(meAlive ? { forfeitLabel: t("party.forfeit"), confirmTitle: t("party.forfeitConfirm"), confirmBody: t("party.forfeitHint") } : { forfeitLabel: t("party.leave"), confirmTitle: t("party.leave"), confirmBody: t("party.leaveHint") })}
        onForfeit={() => {
          // still in: knocked out, keep watching · already out: leave the room
          if (meAlive) socketRef.current?.send({ type: "forfeit", data: {} });
          else leave();
        }}
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-10 text-center">{children}</div>;
}
