"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { mutate } from "swr";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import type { AchievementId, RealtimeEvent } from "./types";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "./session";

type Listener = (e: RealtimeEvent) => void;
type Ctx = { subscribe: (fn: Listener) => () => void; emit: (event: string, payload: unknown) => void };
const RealtimeContext = createContext<Ctx | null>(null);

/**
 * One app-wide Socket.IO connection for signed-in pages (separate from the in-game socket).
 * The server pushes "notify" events (chat messages, read receipts, typing, friend requests);
 * this provider refreshes the affected SWR caches and shows toasts.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { t, href } = useI18n();
  const pathname = usePathname();
  const listeners = useRef(new Set<Listener>());
  const socketRef = useRef<Socket | null>(null);
  const pathRef = useRef(pathname);
  const { me } = useMe();
  const router = useRouter();
  const routerRef = useRef(router);
  const myIdRef = useRef<number | null>(null);
  const myNameRef = useRef<string | null>(null);
  useEffect(() => {
    pathRef.current = pathname;
    myIdRef.current = me?.id ?? null;
    myNameRef.current = me?.username ?? null;
    routerRef.current = router;
  }, [pathname, me?.id, me?.username, router]);

  useEffect(() => {
    const socket = io({ path: "/ws", transports: ["websocket"], withCredentials: true, autoConnect: false, reconnectionDelayMax: 10000 });
    socketRef.current = socket;
    // next tick: the dev double-mount closes the first instance before it connects
    const start = setTimeout(() => socket.connect(), 0);

    socket.on("notify", (e: RealtimeEvent) => {
      listeners.current.forEach((fn) => fn(e));
      switch (e.type) {
        case "chat:message": {
          void mutate("/api/chat/conversations");
          void mutate("/api/chat/unread");
          const onThread = pathRef.current.includes("/chat") && new URLSearchParams(window.location.search).get("with") === e.from.username;
          // toast only for messages sent to me, when that conversation isn't open
          if (e.message.from !== myIdRef.current && !onThread) {
            toast.info(e.from.displayName, {
              description:
                e.message.kind === "invite"
                  ? t("chat.inviteToast")
                  : e.message.kind === "result"
                    ? t("chat.resultPreview", { score: e.message.body.replace("-", " – ") })
                    : e.message.kind === "tournament"
                      ? t("chat.tournamentPreview")
                      : e.message.body.slice(0, 120),
              action: { label: t("chat.open"), onClick: () => routerRef.current.push(`${href("/chat")}?with=${e.from.username}`) },
            });
          }
          break;
        }
        case "chat:read":
          void mutate((key) => typeof key === "string" && key.startsWith("/api/chat/"));
          break;
        case "friend:request":
          void mutate("/api/friends/requests");
          toast.info(t("friends.requestToast", { name: e.from.displayName }), {
            action: { label: t("nav.friends"), onClick: () => routerRef.current.push(href("/friends")) },
          });
          break;
        case "achievement":
          announceAchievement(e.id, t, myNameRef.current ? () => routerRef.current.push(href(`/profile/${myNameRef.current}`)) : undefined);
          break;
        case "levelUp":
          announceLevelUp(e.level, t);
          break;
        case "friend:accepted":
          void mutate("/api/friends");
          void mutate("/api/friends/requests");
          toast.success(t("friends.accepted", { name: e.by.displayName }));
          break;
      }
    });

    return () => {
      clearTimeout(start);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [t, href]);

  const value: Ctx = {
    subscribe: (fn) => {
      listeners.current.add(fn);
      return () => listeners.current.delete(fn);
    },
    emit: (event, payload) => {
      socketRef.current?.emit(event, payload);
    },
  };

  return <RealtimeContext value={value}>{children}</RealtimeContext>;
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used inside RealtimeProvider");
  return ctx;
}

/** "Achievement unlocked" toast (shared by the app shell and the game screen). */
export function announceAchievement(id: AchievementId, t: (key: string, vars?: Record<string, string | number>) => string, onView?: () => void) {
  toast.success(t("achievements.unlockedToast", { name: t(`achievements.${id}.title`) }), {
    description: t(`achievements.${id}.body`),
    ...(onView ? { action: { label: t("achievements.view"), onClick: onView } } : {}),
  });
}

/** "Level up" toast (shared by the app shell and the game screen). */
export function announceLevelUp(level: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  toast.success(t("profile.levelUp", { n: level }));
}
