"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Ban, Check, Ellipsis, MessageSquare, Search, Swords, User, UserMinus, UserPlus, Users, ChevronDown, Eye } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError, fetcher } from "@/lib/api";
import type { FriendRequest, FriendshipState, Page, PublicUser, SearchResult, SearchSort } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge, CountBadge, EmptyState, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Modal, Panel, Segmented, Spinner } from "@/components/ui/primitives";
import { Pager, PlayerChip, useTimeAgo } from "@/components/game/cards";
import { PanelError, RowsSkeleton, SectionLabel } from "./parts";

const FRIENDS = "/api/friends";
const REQUESTS = "/api/friends/requests";
const BLOCKS = "/api/blocks";
const isSearchKey = (key: unknown) => typeof key === "string" && key.startsWith("/api/users/search");

type Actions = {
  busy: (user: PublicUser) => boolean;
  add: (user: PublicUser) => void;
  accept: (req: FriendRequest) => void;
  decline: (req: FriendRequest) => void;
  cancel: (req: FriendRequest) => void;
  unblock: (user: PublicUser) => void;
  askRemove: (user: PublicUser) => void;
  askBlock: (user: PublicUser) => void;
};

type Confirm = { kind: "remove" | "block"; user: PublicUser };

export function FriendsView() {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const friends = useSWR<PublicUser[]>(FRIENDS, fetcher);
  const requests = useSWR<FriendRequest[]>(REQUESTS, fetcher);
  const blocks = useSWR<PublicUser[]>(BLOCKS, fetcher);
  const searchRef = useRef<HTMLInputElement>(null);

  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const errorText = (err: unknown) => (err instanceof ApiError && err.status === 0 ? t("common.networkError") : t("common.error"));

  /** Update every cached search page in place, then revalidate it. */
  const setFriendship = (userId: number, friendship: FriendshipState) =>
    mutate<Page<SearchResult>>(isSearchKey, (page) => page && { ...page, items: page.items.map((u) => (u.id === userId ? { ...u, friendship } : u)) });

  async function run<T>(user: PublicUser, action: () => Promise<T>, onDone: (result: T) => void | Promise<unknown>, success: string) {
    setBusyIds((s) => new Set(s).add(user.id));
    try {
      const result = await action();
      await onDone(result);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorText(err));
      // The other side may have changed the relationship: show the real state.
      void Promise.all([mutate(FRIENDS), mutate(REQUESTS), mutate(BLOCKS), mutate(isSearchKey)]);
      return false;
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(user.id);
        return next;
      });
    }
  }

  const withoutUser = (id: number) => (list?: PublicUser[]) => list?.filter((u) => u.id !== id);
  const withoutRequest = (id: number) => (list?: FriendRequest[]) => list?.filter((r) => r.id !== id);

  const actions: Actions = {
    busy: (user) => busyIds.has(user.id),
    add: (user) =>
      void run(
        user,
        () => api.post<FriendRequest>(REQUESTS, { username: user.username }),
        (req) => Promise.all([setFriendship(user.id, "request_sent"), mutate<FriendRequest[]>(REQUESTS, (list) => (list ? [...list, req] : list))]),
        t("friends.added", { name: user.displayName })
      ),
    accept: (req) =>
      void run(
        req.user,
        () => api.post<PublicUser>(`${REQUESTS}/${req.id}/accept`),
        (friend) =>
          Promise.all([
            mutate<FriendRequest[]>(REQUESTS, withoutRequest(req.id)),
            mutate<PublicUser[]>(FRIENDS, (list) => (list ? [...list.filter((u) => u.id !== friend.id), friend] : list)),
            setFriendship(req.user.id, "friends"),
          ]),
        t("friends.accepted", { name: req.user.displayName })
      ),
    decline: (req) =>
      void run(
        req.user,
        () => api.post<void>(`${REQUESTS}/${req.id}/decline`),
        () => Promise.all([mutate<FriendRequest[]>(REQUESTS, withoutRequest(req.id)), setFriendship(req.user.id, "none")]),
        t("friends.declined")
      ),
    cancel: (req) =>
      void run(
        req.user,
        () => api.del(`${REQUESTS}/${req.id}`),
        () => Promise.all([mutate<FriendRequest[]>(REQUESTS, withoutRequest(req.id)), setFriendship(req.user.id, "none")]),
        t("friends.cancelled")
      ),
    unblock: (user) =>
      void run(
        user,
        () => api.del(`${BLOCKS}/${encodeURIComponent(user.username)}`),
        () => Promise.all([mutate<PublicUser[]>(BLOCKS, withoutUser(user.id)), setFriendship(user.id, "none")]),
        t("friends.unblocked", { name: user.displayName })
      ),
    askRemove: (user) => {
      setConfirm({ kind: "remove", user });
      setConfirmOpen(true);
    },
    askBlock: (user) => {
      setConfirm({ kind: "block", user });
      setConfirmOpen(true);
    },
  };

  async function confirmAction() {
    if (!confirm) return;
    const { kind, user } = confirm;
    const ok =
      kind === "remove"
        ? await run(
            user,
            () => api.del(`${FRIENDS}/${encodeURIComponent(user.username)}`),
            () => Promise.all([mutate<PublicUser[]>(FRIENDS, withoutUser(user.id)), setFriendship(user.id, "none")]),
            t("friends.removed", { name: user.displayName })
          )
        : await run(
            user,
            () => api.post<void>(BLOCKS, { username: user.username }),
            () =>
              Promise.all([
                mutate<PublicUser[]>(FRIENDS, withoutUser(user.id)),
                mutate<FriendRequest[]>(REQUESTS, (list) => list?.filter((r) => r.user.id !== user.id)),
                mutate<PublicUser[]>(BLOCKS, (list) => (list ? [...list.filter((u) => u.id !== user.id), user] : list)),
                setFriendship(user.id, "blocked"),
              ]),
            t("friends.blocked", { name: user.displayName })
          );
    if (ok) setConfirmOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] stack !gap-6">
      <h1 className="pix pix-md max-sm:!text-[16px] max-sm:!leading-6">{t("friends.title")}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="stack !gap-6 min-w-0">
          <SearchPanel inputRef={searchRef} requests={requests.data} requestsReady={!!requests.data} actions={actions} />
          <RequestsPanel swr={requests} actions={actions} />
        </div>
        <div className="stack !gap-6 min-w-0">
          <FriendsPanel swr={friends} actions={actions} onFindPlayers={() => searchRef.current?.focus()} />
          <BlockedPanel swr={blocks} actions={actions} />
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirm ? t(confirm.kind === "remove" ? "profile.removeFriend" : "profile.block") : ""}
        description={
          confirm ? t(confirm.kind === "remove" ? "profile.removeFriendConfirm" : "profile.blockConfirm", { name: confirm.user.displayName }) : undefined
        }
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="danger" loading={!!confirm && busyIds.has(confirm.user.id)} onClick={confirmAction}>
              {confirm?.kind === "block" ? t("profile.block") : t("common.remove")}
            </Button>
          </>
        }
      />
    </div>
  );
}

type Swr<T> = { data?: T; error?: unknown; isLoading: boolean; mutate: () => unknown };

/* ---------------- Search ---------------- */
function SearchPanel({
  inputRef,
  requests,
  requestsReady,
  actions,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  requests?: FriendRequest[];
  requestsReady: boolean;
  actions: Actions;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const [presence, setPresence] = useState<"" | "ONLINE" | "INGAME">("");
  const [relation, setRelation] = useState<"" | "friends" | "others">("");
  const [sort, setSort] = useState<SearchSort>("name");
  const [page, setPage] = useState(1);
  const filtered = presence !== "" || relation !== "" || sort !== "name";

  const typed = q.trim();
  // search by name (2+ characters), or browse with filters alone
  const params = new URLSearchParams();
  if (debounced.length >= 2) params.set("q", debounced);
  if (presence) params.set("presence", presence);
  if (relation) params.set("relation", relation);
  if (sort !== "name") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const active = debounced.length >= 2 || filtered;
  const key = active ? `/api/users/search?${params}` : null;
  const { data, error, isLoading, mutate } = useSWR<Page<SearchResult>>(key, fetcher, { keepPreviousData: true });

  const tooShort = typed.length < 2 && !filtered;
  const waiting = !tooShort && (typed !== debounced || isLoading);
  // never show the previous query's results under a failed request
  const results = !tooShort && !waiting && !error ? data?.items : undefined;

  let message = "";
  let messageVisible = true;
  if (tooShort) message = t("friends.searchHint");
  else if (results && results.length === 0) message = debounced.length >= 2 ? t("friends.noResults", { q: debounced }) : t("friends.noMatches");
  else if (results) {
    message = t("friends.resultsCount", { n: results.length });
    messageVisible = false;
  }

  return (
    <Panel title={<h2 id="friends-search-title" className="t-heading">{t("friends.search")}</h2>} aria-labelledby="friends-search-title">
      <div className="stack stack-3">
        <Input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t("friends.searchPlaceholder")}
          aria-labelledby="friends-search-title"
          aria-describedby="friends-search-status"
          autoComplete="off"
          spellCheck={false}
          icon={<Search className="ico" aria-hidden />}
          trailing={waiting ? <Spinner /> : undefined}
        />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("friends.filters")}>
          <Segmented
            className="max-w-full flex-wrap"
            label={t("friends.filterPresence")}
            value={presence}
            onChange={(v) => {
              setPresence(v);
              setPage(1);
            }}
            options={[
              { value: "", label: t("friends.any") },
              { value: "ONLINE", label: t("presence.ONLINE") },
              { value: "INGAME", label: t("presence.INGAME") },
            ]}
          />
          <Segmented
            className="max-w-full flex-wrap"
            label={t("friends.filterRelation")}
            value={relation}
            onChange={(v) => {
              setRelation(v);
              setPage(1);
            }}
            options={[
              { value: "", label: t("friends.everyone") },
              { value: "friends", label: t("friends.onlyFriends") },
              { value: "others", label: t("friends.notFriends") },
            ]}
          />
          <label className="row !gap-2 t-caption muted">
            {t("friends.sortBy")}
            <span className="input !h-8 !w-auto text-[13px] text-fg">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SearchSort);
                  setPage(1);
                }}
              >
                <option value="name">{t("friends.sortName")}</option>
                <option value="newest">{t("friends.sortNewest")}</option>
                <option value="wins">{t("friends.sortWins")}</option>
              </select>
              <ChevronDown className="ico !h-4 !w-4 subtle" aria-hidden />
            </span>
          </label>
        </div>
        <p id="friends-search-status" aria-live="polite" className={messageVisible ? (tooShort ? "t-caption subtle" : "muted") : "sr-only"}>
          {message}
        </p>
        {waiting && <RowsSkeleton rows={2} />}
        {!tooShort && !waiting && error && <PanelError title={t("friends.searchError")} error={error} onRetry={() => mutate()} />}
        {results && results.length > 0 && (
          <ul className="stack">
            {results.map((user) => (
              <li key={user.id} className="list-row">
                <div className="grow min-w-0">
                  <PlayerChip user={user} />
                </div>
                <SearchAction user={user} requests={requests} requestsReady={requestsReady} actions={actions} />
              </li>
            ))}
          </ul>
        )}
        {results && data && data.total > data.pageSize && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </div>
    </Panel>
  );
}

function SearchAction({ user, requests, requestsReady, actions }: { user: SearchResult; requests?: FriendRequest[]; requestsReady: boolean; actions: Actions }) {
  const { t } = useI18n();
  const busy = actions.busy(user);
  const state: FriendshipState = user.friendship;
  switch (state) {
    case "none":
      return (
        <Button type="button" size="sm" className="max-sm:!px-2" loading={busy} onClick={() => actions.add(user)}>
          {!busy && <UserPlus className="ico" aria-hidden />}
          <span className="max-sm:sr-only">{t("profile.addFriend")}</span>
        </Button>
      );
    case "request_sent":
      return (
        <Button type="button" size="sm" className="max-sm:!px-2" disabled>
          <Check className="ico" aria-hidden />
          <span className="max-sm:sr-only">{t("profile.requestSent")}</span>
        </Button>
      );
    case "request_received": {
      const req = requests?.find((r) => r.direction === "received" && r.user.id === user.id);
      return (
        <Button type="button" size="sm" className="max-sm:!px-2" loading={busy} disabled={!requestsReady || !req} onClick={() => req && actions.accept(req)}>
          {!busy && <Check className="ico" aria-hidden />}
          <span className="max-sm:sr-only">{t("friends.accept")}</span>
        </Button>
      );
    }
    case "friends":
      return <Badge icon={<Users className="ico" aria-hidden />}>{t("friends.friendsBadge")}</Badge>;
    case "blocked":
      return (
        <Button type="button" size="sm" className="max-sm:!px-2" variant="ghost" loading={busy} onClick={() => actions.unblock(user)}>
          {t("profile.unblock")}
        </Button>
      );
    case "blocked_you":
      return null;
    default: {
      const never: never = state;
      return never;
    }
  }
}

/* ---------------- Pending requests ---------------- */
function RequestsPanel({ swr, actions }: { swr: Swr<FriendRequest[]>; actions: Actions }) {
  const { t } = useI18n();
  const ago = useTimeAgo();
  const received = swr.data?.filter((r) => r.direction === "received") ?? [];
  const sent = swr.data?.filter((r) => r.direction === "sent") ?? [];

  let body;
  if (!swr.data && swr.error) body = <PanelError title={t("friends.requestsError")} error={swr.error} onRetry={() => swr.mutate()} />;
  else if (!swr.data) body = <RowsSkeleton rows={2} />;
  else if (swr.data.length === 0) body = <p className="muted">{t("friends.noPending")}</p>;
  else
    body = (
      <div className="stack stack-3">
        {received.length > 0 && (
          <section className="stack" aria-label={t("friends.received")}>
            <SectionLabel>{t("friends.received")}</SectionLabel>
            <ul className="stack">
              {received.map((req) => {
                const busy = actions.busy(req.user);
                return (
                  <li key={req.id} className="list-row bg-surface-2 max-sm:flex-wrap">
                    <div className="grow min-w-0 max-sm:basis-full">
                      <PlayerChip user={req.user} meta={<time dateTime={req.createdAt}>{ago(req.createdAt)}</time>} />
                    </div>
                    <Button type="button" size="sm" loading={busy} onClick={() => actions.accept(req)} aria-label={t("friends.acceptFrom", { name: req.user.displayName })}>
                      {!busy && <Check className="ico" aria-hidden />}
                      <span>{t("friends.accept")}</span>
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => actions.decline(req)} aria-label={t("friends.declineFrom", { name: req.user.displayName })}>
                      {t("friends.decline")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {sent.length > 0 && (
          <section className="stack" aria-label={t("friends.sent")}>
            <SectionLabel>{t("friends.sent")}</SectionLabel>
            <ul className="stack">
              {sent.map((req) => (
                <li key={req.id} className="list-row">
                  <div className="grow min-w-0">
                    <PlayerChip user={req.user} meta={t("friends.waiting")} />
                  </div>
                  <Button type="button" size="sm" variant="ghost" loading={actions.busy(req.user)} onClick={() => actions.cancel(req)} aria-label={t("friends.cancelTo", { name: req.user.displayName })}>
                    {t("common.cancel")}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );

  return (
    <Panel title={t("friends.pending")} actions={<CountBadge count={received.length} label={t("friends.pendingCount", { n: received.length })} />}>
      {body}
    </Panel>
  );
}

/* ---------------- Friends list ---------------- */
function FriendsPanel({ swr, actions, onFindPlayers }: { swr: Swr<PublicUser[]>; actions: Actions; onFindPlayers: () => void }) {
  const { t, href } = useI18n();

  let body;
  if (!swr.data && swr.error) body = <PanelError title={t("friends.loadError")} error={swr.error} onRetry={() => swr.mutate()} />;
  else if (!swr.data) body = <RowsSkeleton rows={4} />;
  else if (swr.data.length === 0)
    body = (
      <EmptyState
        icon={<Users className="ico" aria-hidden />}
        title={t("friends.emptyTitle")}
        body={t("friends.empty")}
        action={
          <Button type="button" onClick={onFindPlayers}>
            <Search className="ico" aria-hidden />
            <span>{t("friends.search")}</span>
          </Button>
        }
      />
    );
  else
    body = (
      <ul className="stack">
        {swr.data.map((friend) => (
          <li key={friend.id} className="list-row">
            <div className="grow min-w-0">
              <PlayerChip user={friend} />
            </div>
            {friend.presence === "ONLINE" && (
              <Button asChild size="sm" className="max-sm:!px-2">
                <Link href={`${href("/play")}?mode=create&invite=${encodeURIComponent(friend.username)}`}>
                  <Swords className="ico" aria-hidden />
                  <span className="max-sm:sr-only">{t("lobby.invite")}</span>
                </Link>
              </Button>
            )}
            {friend.presence === "INGAME" && (
              <Button asChild size="sm" className="max-sm:!px-2">
                <Link href={`${href("/watch")}?user=${friend.id}`}>
                  <Eye className="ico" aria-hidden />
                  <span className="max-sm:sr-only">{t("watch.watchFriend")}</span>
                </Link>
              </Button>
            )}
            <Link
              href={href("/chat")}
              className="icon-btn icon-btn-sm"
              aria-label={t("friends.messageUser", { name: friend.displayName })}
              title={t("friends.messageUser", { name: friend.displayName })}
            >
              <MessageSquare className="ico" aria-hidden />
            </Link>
            <Menu>
              <MenuTrigger asChild>
                <IconButton size="sm" label={t("friends.moreFor", { name: friend.displayName })}>
                  <Ellipsis className="ico" aria-hidden />
                </IconButton>
              </MenuTrigger>
              <MenuContent>
                <MenuItem asChild>
                  <Link href={href(`/profile/${friend.username}`)} className="text-fg no-underline">
                    <User className="ico" aria-hidden />
                    {t("friends.viewProfile")}
                  </Link>
                </MenuItem>
                <MenuSeparator />
                <MenuItem onSelect={() => actions.askRemove(friend)}>
                  <UserMinus className="ico" aria-hidden />
                  {t("profile.removeFriend")}
                </MenuItem>
                <MenuItem danger onSelect={() => actions.askBlock(friend)}>
                  <Ban className="ico" aria-hidden />
                  {t("profile.block")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </li>
        ))}
      </ul>
    );

  return (
    <Panel
      title={t("friends.list")}
      actions={swr.data && swr.data.length > 0 ? <span className="num num-md muted" aria-label={t("friends.count", { n: swr.data.length })}>{swr.data.length}</span> : undefined}
    >
      {body}
    </Panel>
  );
}

/* ---------------- Blocked players ---------------- */
function BlockedPanel({ swr, actions }: { swr: Swr<PublicUser[]>; actions: Actions }) {
  const { t } = useI18n();

  let body;
  if (!swr.data && swr.error) body = <PanelError title={t("friends.blocksError")} error={swr.error} onRetry={() => swr.mutate()} />;
  else if (!swr.data) body = <RowsSkeleton rows={1} />;
  else if (swr.data.length === 0) body = <p className="muted">{t("friends.noBlocked")}</p>;
  else
    body = (
      <ul className="stack">
        {swr.data.map((user) => (
          <li key={user.id} className="list-row">
            <div className="grow min-w-0">
              <PlayerChip user={user} showPresence={false} />
            </div>
            <Button type="button" size="sm" variant="ghost" loading={actions.busy(user)} onClick={() => actions.unblock(user)} aria-label={t("friends.unblockUser", { name: user.displayName })}>
              {t("profile.unblock")}
            </Button>
          </li>
        ))}
      </ul>
    );

  return <Panel title={t("friends.blockedList")}>{body}</Panel>;
}
