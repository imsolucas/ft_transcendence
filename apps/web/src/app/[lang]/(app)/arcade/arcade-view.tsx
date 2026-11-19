"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import useSWR from "swr";
import { Users } from "lucide-react";
import type { HallPlayerView } from "shared";
import {
  CABINETS,
  HALL_DOWN,
  HALL_EMOTES,
  HALL_H,
  HALL_LEFT,
  HALL_RIGHT,
  HALL_SNAPSHOT_HZ,
  HALL_UP,
  HALL_W,
  OBSTACLES,
  cabinetAt,
  moveInHall,
  type CabinetId,
  type HallEmote,
  type HallPos,
} from "shared/hall/hall";
import { useI18n } from "@/i18n/I18nProvider";
import { withFrom } from "@/lib/return-to";
import { fetcher } from "@/lib/api";
import type { DailyInfo } from "@/lib/types";
import { GameSocket, type ConnectionStatus } from "@/lib/game/socket";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { BoardArt, CabinetArt, CouchArt } from "@/components/arcade/hall-art";
import { HallCharacter } from "@/components/arcade/hall-character";

const KEY_BITS: Record<string, number> = {
  w: HALL_UP,
  arrowup: HALL_UP,
  s: HALL_DOWN,
  arrowdown: HALL_DOWN,
  a: HALL_LEFT,
  arrowleft: HALL_LEFT,
  d: HALL_RIGHT,
  arrowright: HALL_RIGHT,
};
/** the smallest scale the hall is drawn at; narrower screens follow you with a camera */
const MIN_SCALE = 1.4;
/** snap your avatar to the server's position when prediction is this far off (walking / standing) */
const SNAP_WALKING = 64;
const SNAP_STILL = 28;
/** a held direction is re-sent this often (the server stops a silent avatar after 3 s) */
const RESEND_MS = 1000;

interface Remote {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  x: number;
  y: number;
  at: number;
  facing: 1 | -1;
  moving: boolean;
}

const place = (el: HTMLElement | undefined | null, x: number, y: number, facing: 1 | -1, moving = false) => {
  if (!el) return;
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.zIndex = String(Math.round(y));
  el.dataset.facing = facing === 1 ? "r" : "l";
  // drives the walk cycle (styles/arcade.css)
  if (moving) el.dataset.moving = "";
  else delete el.dataset.moving;
};

/**
 * The arcade hall: walk around a small room with other players and step up to a cabinet.
 * The server moves everyone from input bits; your own avatar is predicted with the same
 * movement code so it answers at once, and other players are interpolated between snapshots.
 */
export function ArcadeView() {
  const { t, href } = useI18n();
  const router = useRouter();
  const { data: daily } = useSWR<DailyInfo>("/api/daily", fetcher, { revalidateOnFocus: false });
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [players, setPlayers] = useState<HallPlayerView[]>([]);
  const [you, setYou] = useState<string | null>(null);
  const [instance, setInstance] = useState<{ n: number; capacity: number } | null>(null);
  const [bubbles, setBubbles] = useState<Record<string, { emote: HallEmote; key: number }>>({});
  const [near, setNear] = useState<CabinetId | null>(null);
  const [live, setLive] = useState(0);
  const [scale, setScale] = useState(2);

  const socket = useRef<GameSocket | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const scene = useRef<HTMLDivElement | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const remote = useRef(new Map<string, Remote>());
  const youRef = useRef<string | null>(null);
  const me = useRef<HallPos | null>(null);
  const server = useRef<(HallPos & { moving: boolean }) | null>(null);
  const keys = useRef(0);
  const target = useRef<{ x: number; y: number } | null>(null);
  const sentBits = useRef(0);
  const scaleRef = useRef(2);
  const nearRef = useRef<CabinetId | null>(null);

  // ---- connection
  useEffect(() => {
    const s = new GameSocket();
    socket.current = s;
    const offStatus = s.onStatus((st) => {
      setStatus(st);
      if (st === "connected") s.send({ type: "hallJoin", data: {} });
    });
    const askLive = () => s.send({ type: "liveMatches", data: {} });
    const liveTimer = setInterval(askLive, 10_000);
    const bubbleTimers = new Set<ReturnType<typeof setTimeout>>();
    const offMsg = s.onMessage((msg) => {
      switch (msg.type) {
        case "hallWelcome": {
          const { players: list, you: id, instance: n, capacity } = msg.data;
          youRef.current = id;
          setYou(id);
          setInstance({ n, capacity });
          const now = performance.now();
          remote.current.clear();
          // a fresh server avatar has no input yet: send whatever is held now
          sentBits.current = -1;
          for (const p of list) {
            if (p.id === id) {
              me.current = { x: p.x, y: p.y, facing: p.facing };
              server.current = { ...me.current, moving: false };
            } else remote.current.set(p.id, { fromX: p.x, fromY: p.y, toX: p.x, toY: p.y, x: p.x, y: p.y, at: now, facing: p.facing, moving: false });
          }
          setPlayers(list);
          askLive();
          break;
        }
        case "hallPlayerJoined": {
          const p = msg.data.player;
          remote.current.set(p.id, { fromX: p.x, fromY: p.y, toX: p.x, toY: p.y, x: p.x, y: p.y, at: performance.now(), facing: p.facing, moving: false });
          setPlayers((list) => [...list.filter((q) => q.id !== p.id), p]);
          break;
        }
        case "hallPlayerLeft": {
          remote.current.delete(msg.data.id);
          setPlayers((list) => list.filter((q) => q.id !== msg.data.id));
          break;
        }
        case "hallSnapshot": {
          const now = performance.now();
          for (const [id, x, y, facing, moving] of msg.data.p) {
            if (id === youRef.current) {
              server.current = { x, y, facing, moving: moving === 1 };
              continue;
            }
            const r = remote.current.get(id);
            if (!r) continue;
            r.moving = moving === 1;
            r.fromX = r.x;
            r.fromY = r.y;
            r.toX = x;
            r.toY = y;
            r.at = now;
            r.facing = facing;
          }
          break;
        }
        case "hallEmoteShown": {
          const { id, emote } = msg.data;
          const key = Date.now();
          setBubbles((b) => ({ ...b, [id]: { emote, key } }));
          const timer = setTimeout(() => {
            bubbleTimers.delete(timer);
            setBubbles((b) => (b[id]?.key === key ? Object.fromEntries(Object.entries(b).filter(([k]) => k !== id)) : b));
          }, 2600);
          bubbleTimers.add(timer);
          break;
        }
        case "liveMatchesList":
          setLive(msg.data.matches.length);
          break;
      }
    });
    return () => {
      clearInterval(liveTimer);
      bubbleTimers.forEach(clearTimeout);
      offStatus();
      offMsg();
      s.send({ type: "hallLeave", data: {} });
      s.close();
      socket.current = null;
    };
  }, []);

  // ---- scale to the container (a camera follows you on narrow screens)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const s = Math.max(MIN_SCALE, el.clientWidth / HALL_W);
      scaleRef.current = s;
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const openCabinet = useCallback(
    (id: CabinetId | null) => {
      const c = CABINETS.find((x) => x.id === id);
      if (c) router.push(withFrom(c.path.replace(/^\/[a-z]+/, (p) => href(p)), "arcade"));
    },
    [router, href]
  );

  const emote = useCallback((e: HallEmote) => socket.current?.send({ type: "hallEmote", data: { emote: e } }), []);

  // ---- keyboard
  useEffect(() => {
    // the hall only takes keys when nothing else is focused (or the hall itself is): menus,
    // dialogs, fields and the links below keep their own keys
    const mine = (e: KeyboardEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || el === document.body) return true;
      if (el.closest('[role="dialog"],[role="menu"],[role="listbox"]')) return false;
      return !!el.closest(".hall-wrap");
    };
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !mine(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const bit = KEY_BITS[k];
      if (bit) {
        e.preventDefault();
        keys.current |= bit;
        target.current = null;
        return;
      }
      if ((k === "e" || k === "enter") && nearRef.current) {
        e.preventDefault();
        openCabinet(nearRef.current);
        return;
      }
      const n = Number(k);
      if (n >= 1 && n <= HALL_EMOTES.length) emote(HALL_EMOTES[n - 1]!);
    };
    const up = (e: KeyboardEvent) => {
      const bit = KEY_BITS[e.key.toLowerCase()];
      if (bit) keys.current &= ~bit;
    };
    // the frame loop doesn't run in a hidden tab: stop the avatar right away
    const blur = () => {
      keys.current = 0;
      target.current = null;
      if (socket.current?.send({ type: "hallInput", data: { bits: 0 } })) sentBits.current = 0;
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [openCabinet, emote]);

  // ---- the frame loop: predict yourself, interpolate others, move the camera
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let stuck = 0;
    let lastSent = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const mine = me.current;
      let bits = keys.current;
      if (mine && target.current && bits === 0) {
        const dx = target.current.x - mine.x;
        const dy = target.current.y - mine.y;
        if (Math.abs(dx) > 2) bits |= dx > 0 ? HALL_RIGHT : HALL_LEFT;
        if (Math.abs(dy) > 2) bits |= dy > 0 ? HALL_DOWN : HALL_UP;
        if (bits === 0) target.current = null;
      }
      if ((bits !== sentBits.current || (bits !== 0 && now - lastSent > RESEND_MS)) && socket.current?.send({ type: "hallInput", data: { bits } })) {
        sentBits.current = bits;
        lastSent = now;
      }
      if (mine) {
        let next = moveInHall(mine, bits, dt);
        // tap-to-walk into a wall: give up after a moment
        if (target.current && next.x === mine.x && next.y === mine.y) {
          stuck += dt;
          if (stuck > 0.4) target.current = null;
        } else stuck = 0;
        const srv = server.current;
        if (srv) {
          // snapshots lag behind while you walk: only correct big errors then, and settle on the
          // server's spot once both sides have stopped
          const d = Math.hypot(srv.x - next.x, srv.y - next.y);
          const still = bits === 0 && !srv.moving;
          if (d > (still ? SNAP_STILL : SNAP_WALKING)) next = { x: srv.x, y: srv.y, facing: srv.facing };
          else if (still && d > 0.5) next = { x: next.x + (srv.x - next.x) * 0.2, y: next.y + (srv.y - next.y) * 0.2, facing: next.facing };
        }
        const walking = next.x !== mine.x || next.y !== mine.y;
        me.current = next;
        const id = youRef.current;
        if (id) place(els.current.get(id), next.x, next.y, next.facing, walking);
        const c = cabinetAt(next.x, next.y)?.id ?? null;
        if (c !== nearRef.current) {
          nearRef.current = c;
          setNear(c);
        }
        // camera: keep yourself in view when the hall is wider than the screen
        const sc = scene.current;
        const box = wrap.current;
        if (sc && box) {
          const s = scaleRef.current;
          const maxOff = Math.max(0, HALL_W * s - box.clientWidth);
          const off = Math.min(maxOff, Math.max(0, next.x * s - box.clientWidth / 2));
          sc.style.transform = `translateX(${-off}px) scale(${s})`;
        }
      }
      const span = 1000 / HALL_SNAPSHOT_HZ;
      for (const [id, r] of remote.current) {
        const k = Math.min(1, (now - r.at) / span);
        r.x = r.fromX + (r.toX - r.fromX) * k;
        r.y = r.fromY + (r.toY - r.fromY) * k;
        // still walking while catching up to the last snapshot, or the server says so
        place(els.current.get(id), r.x, r.y, r.facing, r.moving || (k < 1 && Math.abs(r.toX - r.fromX) + Math.abs(r.toY - r.fromY) > 0.5));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** tap or click the floor: walk there */
  const onFloor = (e: ReactPointerEvent<HTMLDivElement>) => {
    const sc = scene.current;
    if (!sc) return;
    const rect = sc.getBoundingClientRect();
    const s = scaleRef.current;
    target.current = { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s };
  };
  /** click a cabinet: use it when you're in front of it, otherwise walk up to it */
  const onCabinet = (id: CabinetId) => {
    if (nearRef.current === id) return openCabinet(id);
    const c = CABINETS.find((x) => x.id === id)!;
    target.current = { x: c.zone.x + c.zone.w / 2, y: c.zone.y + c.zone.h / 2 };
  };

  /** each avatar registers its element once (HallAvatar), so the frame loop can move it */
  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (!el) {
      els.current.delete(id);
      return;
    }
    els.current.set(id, el);
    const pos = id === youRef.current ? me.current : remote.current.get(id);
    if (pos) place(el, pos.x, pos.y, pos.facing);
  }, []);

  const top = daily?.board.slice(0, 3) ?? [];
  const screen = (id: CabinetId) => {
    switch (id) {
      case "ranked":
        return t("arcade.screen.ranked");
      case "party":
        return t("arcade.screen.party");
      case "cycles":
        return t("arcade.screen.cycles");
      case "daily":
        return daily?.board[0] ? `${daily.board[0].initials} ${daily.board[0].score}` : t("arcade.screen.daily");
      case "watch":
        return t("arcade.screen.watch", { n: live });
      case "local":
        return t("arcade.screen.local");
      default:
        return null;
    }
  };
  const nearCab = CABINETS.find((c) => c.id === near);

  const offline =
    status === "disconnected" ? (
      <Panel className="hall-offline">
        <EmptyState
          title={t("arcade.offline")}
          body={t("arcade.offlineBody")}
          action={
            <Button
              onClick={() => {
                setStatus("connecting");
                socket.current?.retry();
              }}
            >
              {t("common.retry")}
            </Button>
          }
        />
      </Panel>
    ) : null;

  return (
    <div className="grid gap-4">
      <header className="row between wrap !gap-3">
        <div>
          <h1 className="pix text-[22px]">{t("arcade.title")}</h1>
          <p className="muted">{t("arcade.subtitle")}</p>
        </div>
        <p className="row t-label muted !gap-2" aria-live="polite">
          <Users className="ico" aria-hidden />
          {instance ? t("arcade.occupancy", { n: instance.n, count: players.length, capacity: instance.capacity }) : t("arcade.connecting")}
        </p>
      </header>

      <div ref={wrap} className="hall-wrap" style={{ height: HALL_H * scale }} tabIndex={0} aria-label={t("arcade.hallLabel")}>
        {offline}
        <div ref={scene} className="hall" style={{ width: HALL_W, height: HALL_H, transform: `scale(${scale})` }} onPointerDown={onFloor}>
          <div className="hall-wall" aria-hidden />
          {CABINETS.map((c) =>
            c.id === "board" ? (
              <button key={c.id} type="button" className="hall-hit" style={{ left: c.box.x, top: c.box.y, width: c.box.w, height: c.box.h, zIndex: Math.round(c.box.y + c.box.h) }} onPointerDown={(e) => e.stopPropagation()} onClick={() => onCabinet(c.id)} aria-label={t(`arcade.cab.${c.id}`)} tabIndex={-1}>
                <BoardArt box={c.box} near={near === c.id}>
                  <span className="hall-board-title">{t("arcade.screen.hiScore")}</span>
                  {top.length === 0 ? (
                    <span>{t("arcade.screen.noScores")}</span>
                  ) : (
                    top.map((r) => (
                      <span key={r.user.id}>
                        {r.rank}. {r.initials} {r.score}
                      </span>
                    ))
                  )}
                </BoardArt>
              </button>
            ) : (
              <button key={c.id} type="button" className="hall-hit" style={{ left: c.box.x, top: c.box.y, width: c.box.w, height: c.box.h, zIndex: Math.round(c.box.y + c.box.h) }} onPointerDown={(e) => e.stopPropagation()} onClick={() => onCabinet(c.id)} aria-label={t(`arcade.cab.${c.id}`)} tabIndex={-1}>
                <CabinetArt id={c.id} box={c.box} near={near === c.id}>
                  {screen(c.id)}
                </CabinetArt>
              </button>
            )
          )}
          <CouchArt box={OBSTACLES[1]!} />
          {players.map((p) => (
            <HallAvatar
              key={p.id}
              player={p}
              you={p.id === you}
              label={p.id === you ? t("common.you") : p.name}
              bubble={bubbles[p.id] ? { key: bubbles[p.id]!.key, text: t(`arcade.emote.${bubbles[p.id]!.emote}`) } : null}
              register={register}
            />
          ))}
        </div>
      </div>

      <div className="row between wrap !gap-3">
        <p className="t-caption muted" aria-live="polite">
          {nearCab ? t("arcade.prompt", { name: t(`arcade.cab.${nearCab.id}`) }) : t("arcade.hint")}
        </p>
        {nearCab && (
          <Button variant="primary" glow="md" onClick={() => openCabinet(nearCab.id)}>
            {t(`arcade.cab.${nearCab.id}`)}
          </Button>
        )}
      </div>

      <div className="row wrap !gap-2" role="group" aria-label={t("arcade.emotes")}>
        {HALL_EMOTES.map((e, i) => (
          <Button key={e} size="sm" variant="ghost" onClick={() => emote(e)} title={`${i + 1}`}>
            {t(`arcade.emote.${e}`)}
          </Button>
        ))}
      </div>

      {/* every cabinet as a plain link too: keyboard, screen readers, or just in a hurry */}
      <Panel>
        <h2 className="t-heading mb-3">{t("arcade.quickPlay")}</h2>
        <div className="row wrap !gap-2">
          {CABINETS.map((c) => (
            <Button key={c.id} asChild size="sm">
              <Link href={withFrom(c.path.replace(/^\/[a-z]+/, (p) => href(p)), "arcade")}>{t(`arcade.cab.${c.id}`)}</Link>
            </Button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function HallAvatar({
  player,
  you,
  label,
  bubble,
  register,
}: {
  player: HallPlayerView;
  you: boolean;
  label: string;
  bubble: { key: number; text: string } | null;
  register: (id: string, el: HTMLElement | null) => void;
}) {
  const id = player.id;
  const ref = useCallback((el: HTMLDivElement | null) => register(id, el), [id, register]);
  return (
    <div ref={ref} className="hall-player" data-you={you || undefined}>
      {bubble && (
        <span key={bubble.key} className="hall-bubble" role="status">
          {bubble.text}
        </span>
      )}
      <span className="hall-name">{label}</span>
      <span className="hall-body">
        <HallCharacter id={player.id} look={player.look} />
      </span>
    </div>
  );
}
