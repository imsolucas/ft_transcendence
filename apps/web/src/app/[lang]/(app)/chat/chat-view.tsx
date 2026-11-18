"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCheck, Gamepad2, MessageSquare, MoreVertical, Send, ShieldOff, Swords, Trophy, ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import type { ChatMessage, Conversation, Profile, PublicUser } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, CountBadge, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger, Modal, Panel, PresenceDot, Skeleton } from "@/components/ui/primitives";
import { useTimeAgo } from "@/components/game/cards";

type Pending = { tempId: string; body: string; failed: boolean };

export function ChatView() {
  const { t } = useI18n();
  const params = useSearchParams();
  const active = params.get("with");
  return (
    <div className="stack stack-5">
      <h1 className="pix pix-md">{t("chat.title")}</h1>
      <div className="grid min-h-[60dvh] gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className={cn(active && "max-md:hidden")}>
          <ConversationList active={active} />
        </div>
        <div className={cn(!active && "max-md:hidden")}>{active ? <Thread key={active} username={active} /> : <NoThread />}</div>
      </div>
    </div>
  );
}

function ConversationList({ active }: { active: string | null }) {
  const { t, href } = useI18n();
  const ago = useTimeAgo();
  const { data, error, mutate: reload } = useSWR<Conversation[]>("/api/chat/conversations");
  return (
    <Panel className="h-full !p-2" aria-label={t("chat.conversations")}>
      {error && !data ? (
        <div className="p-3 stack items-start" role="alert">
          <p className="muted">{t("lobby.loadError")}</p>
          <Button size="sm" onClick={() => reload()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : !data ? (
        <div className="stack p-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="row p-2">
              <Skeleton circle />
              <div className="stack grow">
                <Skeleton style={{ width: "50%" }} />
                <Skeleton style={{ width: "80%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="ico" aria-hidden />}
          title={t("chat.emptyTitle")}
          body={t("chat.emptyBody")}
          action={
            <Button asChild size="sm">
              <Link href={href("/friends")} className="no-underline">
                {t("nav.friends")}
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="stack !gap-1">
          {data.map((c) => (
            <li key={c.user.id}>
              <Link
                href={`${href("/chat")}?with=${c.user.username}`}
                aria-current={active === c.user.username ? "page" : undefined}
                className={cn("list-row no-underline text-fg", active === c.user.username && "is-selected")}
              >
                <Avatar name={c.user.displayName} src={c.user.avatar} presence={c.user.presence} presenceLabel={t(`presence.${c.user.presence}`)} />
                <div className="grow min-w-0">
                  <div className="row between">
                    <span className="t-strong truncate">{c.user.displayName}</span>
                    <time className="t-caption subtle shrink-0" dateTime={c.lastMessage.createdAt}>
                      {ago(c.lastMessage.createdAt)}
                    </time>
                  </div>
                  <div className="row between">
                    <span className={cn("t-caption truncate", c.unread ? "text-fg" : "subtle")}>
                      {c.lastMessage.removed
                        ? t("chat.removed")
                        : c.lastMessage.kind === "invite"
                        ? t("chat.inviteToast")
                        : c.lastMessage.kind === "result"
                          ? t("chat.resultPreview", { score: c.lastMessage.body.replace("-", " – ") })
                          : c.lastMessage.kind === "tournament"
                            ? t("chat.tournamentPreview")
                            : c.lastMessage.body}
                    </span>
                    <CountBadge count={c.unread} label={t("chat.unread", { n: c.unread })} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NoThread() {
  const { t } = useI18n();
  return (
    <Panel className="flex h-full items-center justify-center">
      <EmptyState icon={<MessageSquare className="ico" aria-hidden />} title={t("chat.pickTitle")} body={t("chat.pickBody")} />
    </Panel>
  );
}

function Thread({ username }: { username: string }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const ago = useTimeAgo();
  const { me } = useMe();
  const { subscribe, emit } = useRealtime();
  const key = `/api/chat/${username}/messages`;
  const profile = useSWR<Profile>(`/api/users/${username}`, { refreshInterval: 15000 });
  const messages = useSWR<ChatMessage[]>(key);
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const other: PublicUser | undefined = profile.data;
  const blocked = profile.data?.friendship === "blocked";

  // Live updates: new messages, read receipts, typing
  useEffect(() => {
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    const off = subscribe((e) => {
      if (!other) return;
      if (e.type === "chat:message" && (e.message.from === other.id || e.message.to === other.id)) {
        void mutate(key);
        if (e.message.from === other.id) {
          setTyping(false);
          void api.post(`/api/chat/${username}/read`).then(() => mutate("/api/chat/unread"));
        }
      } else if (e.type === "chat:read" && e.by === other.id) {
        void mutate(key);
      } else if (e.type === "chat:typing" && e.from === other.id) {
        setTyping(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setTyping(false), 3000);
      }
    });
    return () => {
      off();
      clearTimeout(typingTimer);
    };
  }, [subscribe, other, key, username]);

  // Mark as read on open
  useEffect(() => {
    if (!messages.data) return;
    if (messages.data.some((m) => m.from === other?.id && !m.readAt)) {
      void api.post(`/api/chat/${username}/read`).then(() => {
        void mutate("/api/chat/unread");
        void mutate("/api/chat/conversations");
      });
    }
  }, [messages.data, other?.id, username]);

  // Keep the newest message in view
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.data?.length, pending.length, typing]);

  async function send(body: string, tempId = crypto.randomUUID()) {
    setPending((p) => [...p.filter((x) => x.tempId !== tempId), { tempId, body, failed: false }]);
    try {
      await api.post(`/api/chat/${username}/messages`, { body });
      setPending((p) => p.filter((x) => x.tempId !== tempId));
      await mutate(key);
      void mutate("/api/chat/conversations");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setUnavailable(true);
      if (err instanceof ApiError && err.code === "MUTED") toast.error(t("chat.muted"));
      setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: true } : x)));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    void send(body);
  }

  async function block() {
    try {
      await api.post("/api/blocks", { username });
      toast.success(t("friends.blocked", { name: other?.displayName ?? username }));
      void profile.mutate();
      void mutate("/api/friends");
    } catch {
      toast.error(t("common.error"));
    }
  }
  async function unblock() {
    try {
      await api.del(`/api/blocks/${username}`);
      toast.success(t("friends.unblocked", { name: other?.displayName ?? username }));
      setUnavailable(false);
      void profile.mutate();
    } catch {
      toast.error(t("common.error"));
    }
  }

  // read receipts belong to what you wrote, not to server notices
  const lastMine = useMemo(
    () => [...(messages.data ?? [])].reverse().find((m) => m.from === me?.id && (m.kind === "text" || m.kind === "invite")),
    [messages.data, me?.id]
  );

  if (profile.error instanceof ApiError && profile.error.status === 404) {
    return (
      <Panel>
        <EmptyState title={t("profile.notFound")} body={t("profile.notFoundBody")} />
      </Panel>
    );
  }

  return (
    <Panel className="flex h-[70dvh] flex-col !p-0">
      <header className="row between border-b border-border px-4 py-3">
        <div className="row row-3 min-w-0">
          <Link href={href("/chat")} className="icon-btn md:hidden" aria-label={t("common.back")}>
            <ArrowLeft className="ico" aria-hidden />
          </Link>
          {other ? (
            <>
              <Avatar name={other.displayName} src={other.avatar} presence={other.presence} presenceLabel={t(`presence.${other.presence}`)} />
              <div className="min-w-0">
                <Link href={href(`/profile/${other.username}`)} className="t-strong truncate text-fg no-underline hover:underline">
                  {other.displayName}
                </Link>
                <p className="t-caption subtle row !gap-1.5">
                  <PresenceDot presence={other.presence} inline />
                  {t(`presence.${other.presence}`)}
                </p>
              </div>
            </>
          ) : (
            <Skeleton style={{ width: 160 }} />
          )}
        </div>
        <div className="row">
          {!blocked && !unavailable && (
            <Button size="sm" onClick={() => router.push(`${href("/play")}?mode=create&invite=${username}`)}>
              <Gamepad2 className="ico" aria-hidden />
              <span className="max-sm:sr-only">{t("chat.invite")}</span>
            </Button>
          )}
          <Menu modal={false}>
            <MenuTrigger asChild>
              <IconButton label={t("friends.more")}>
                <MoreVertical className="ico" aria-hidden />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => router.push(href(`/profile/${username}`))}>{t("friends.viewProfile")}</MenuItem>
              {blocked ? <MenuItem onSelect={unblock}>{t("profile.unblock")}</MenuItem> : <MenuItem danger onSelect={() => setBlockOpen(true)}>{t("profile.block")}</MenuItem>}
            </MenuContent>
          </Menu>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-label={t("chat.thread")}>
        {messages.error && !messages.data ? (
          <div className="stack items-start" role="alert">
            <p className="muted">{t("lobby.loadError")}</p>
            <Button size="sm" onClick={() => messages.mutate()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : !messages.data ? (
          <div className="stack">
            <Skeleton style={{ width: "40%", height: 32 }} />
            <Skeleton className="self-end" style={{ width: "30%", height: 32 }} />
          </div>
        ) : messages.data.length === 0 && pending.length === 0 ? (
          <EmptyState icon={<MessageSquare className="ico" aria-hidden />} title={t("chat.firstMessage")} />
        ) : (
          <ol className="stack stack-3">
            {messages.data.map((m) => {
              const mine = m.from === me?.id;
              if (m.kind === "result" || m.kind === "tournament") {
                const name = (id: number) => (id === me?.id ? me?.displayName : other?.displayName) ?? "?";
                const [a, b] = m.body.split("-");
                return (
                  <li key={m.id} className="flex flex-col items-center">
                    <p className="row !gap-2 rounded-md border border-border bg-surface-1 px-3 py-1.5 t-caption muted" role="status">
                      {m.kind === "result" ? <Swords className="ico c-cyan" aria-hidden /> : <Trophy className="ico c-amber" aria-hidden />}
                      {m.kind === "result"
                        ? t("chat.resultNotice", { p1: name(m.from), a, b, p2: name(m.to) })
                        : t("chat.tournamentNotice", { winner: name(m.from), name: m.body })}
                    </p>
                    <time className="t-caption subtle mt-1" dateTime={m.createdAt}>
                      {ago(m.createdAt)}
                    </time>
                  </li>
                );
              }
              return (
                <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  {m.removed ? (
                    <p className="row !gap-2 max-w-[75%] rounded-md border border-dashed border-border px-3 py-2 t-caption subtle italic">
                      <ShieldAlert className="ico" aria-hidden />
                      {t("chat.removed")}
                    </p>
                  ) : m.kind === "invite" ? (
                    <InviteCard mine={mine} code={m.inviteCode ?? ""} name={other?.displayName ?? ""} />
                  ) : (
                    <p
                      className={cn(
                        "max-w-[75%] whitespace-pre-wrap break-words rounded-md border px-3 py-2",
                        mine ? "border-neon-magenta bg-surface-1" : "border-border bg-surface-2"
                      )}
                    >
                      {m.body}
                    </p>
                  )}
                  <span className="t-caption subtle mt-1 row !gap-1">
                    <time dateTime={m.createdAt}>{ago(m.createdAt)}</time>
                    {mine && m.id === lastMine?.id && (
                      <>
                        {m.readAt ? <CheckCheck className="ico !h-3.5 !w-3.5 c-cyan" aria-hidden /> : <Check className="ico !h-3.5 !w-3.5" aria-hidden />}
                        <span>{m.readAt ? t("chat.read") : t("chat.sent")}</span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
            {pending.map((p) => (
              <li key={p.tempId} className="flex flex-col items-end">
                <p className={cn("max-w-[75%] whitespace-pre-wrap break-words rounded-md border px-3 py-2", p.failed ? "border-dashed border-neon-red" : "border-neon-magenta opacity-70")}>{p.body}</p>
                {p.failed ? (
                  <button type="button" className="t-caption c-red mt-1 underline" onClick={() => send(p.body, p.tempId)}>
                    {t("chat.failed")}
                  </button>
                ) : (
                  <span className="t-caption subtle mt-1">{t("chat.sending")}</span>
                )}
              </li>
            ))}
          </ol>
        )}
        {typing && other && (
          <p className="t-caption subtle mt-3 row" role="status">
            <span className="typing" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {t("chat.typing", { name: other.displayName })}
          </p>
        )}
      </div>

      {blocked || unavailable ? (
        <div className="row between border-t border-border px-4 py-3" role="status">
          <span className="row muted">
            <ShieldOff className="ico" aria-hidden />
            {blocked ? t("chat.blockedNotice") : t("chat.unavailable")}
          </span>
          {blocked && (
            <Button size="sm" onClick={unblock}>
              {t("profile.unblock")}
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="row border-t border-border p-3">
          <label htmlFor="chat-composer" className="sr-only">
            {t("chat.composer")}
          </label>
          <textarea
            id="chat-composer"
            rows={1}
            maxLength={1000}
            value={draft}
            placeholder={t("chat.composer")}
            className="input min-h-[40px] flex-1 resize-none py-2"
            onChange={(e) => {
              setDraft(e.target.value);
              if (other) emit("chat:typing", { to: other.id });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
          />
          <Button type="submit" variant="primary" disabled={!draft.trim()} aria-label={t("chat.send")}>
            <Send className="ico" aria-hidden />
            <span className="max-sm:sr-only">{t("chat.send")}</span>
          </Button>
        </form>
      )}

      <Modal
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={t("profile.block")}
        description={t("profile.blockConfirm", { name: other?.displayName ?? username })}
        actions={
          <>
            <Button variant="ghost" onClick={() => setBlockOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setBlockOpen(false);
                void block();
              }}
            >
              {t("profile.block")}
            </Button>
          </>
        }
      />
    </Panel>
  );
}

function InviteCard({ mine, code, name }: { mine: boolean; code: string; name: string }) {
  const { t, href } = useI18n();
  return (
    <div className="panel panel-2 max-w-[320px] !p-4">
      <p className="t-strong row">
        <Gamepad2 className="ico c-magenta" aria-hidden />
        {mine ? t("chat.inviteSent") : t("chat.inviteReceived", { name })}
      </p>
      <p className="t-caption subtle mt-1">
        {t("lobby.roomCode")}: <span className="num num-sm">{code.toUpperCase()}</span>
      </p>
      {!mine && (
        <Button asChild size="sm" variant="primary" className="mt-3">
          <Link href={`${href("/play")}?mode=join&code=${code}`} className="no-underline">
            {t("chat.accept")}
          </Link>
        </Button>
      )}
    </div>
  );
}
