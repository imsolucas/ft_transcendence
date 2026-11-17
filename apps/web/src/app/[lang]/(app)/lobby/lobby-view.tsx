"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { Bot, Gamepad2, Keyboard, Lock, Swords, Trophy, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "@/lib/session";
import type { FriendRequest, MatchSummary, Page, Profile, PublicUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { CountBadge, EmptyState, Panel, Segmented, Skeleton } from "@/components/ui/primitives";
import { MatchCard, MatchCardSkeleton, PlayerChip } from "@/components/game/cards";

const ROOM_CODE = /^[0-9a-f]{8}$/i;

export function LobbyView() {
  const { t } = useI18n();
  const { me } = useMe();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="stack stack-5 min-w-0">
        <div>
          <h1 className="pix pix-md">{t("lobby.title")}</h1>
          {me && <p className="muted mt-1">{t("lobby.greeting", { name: me.displayName })}</p>}
        </div>
        <PlayPanel />
        <div className="grid gap-5 xl:grid-cols-2">
          <StatsPanel username={me?.username} />
          <RecentPanel username={me?.username} />
        </div>
      </div>
      <FriendsSidebar />
    </div>
  );
}

function PlayPanel() {
  const { t, href } = useI18n();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string>();
  const [tCode, setTCode] = useState("");
  const [tError, setTError] = useState<string>();
  const [size, setSize] = useState(4);

  function join(e: FormEvent, code: string, setErr: (s?: string) => void, mode: string) {
    e.preventDefault();
    const c = code.trim();
    if (!ROOM_CODE.test(c)) {
      setErr(t("matchmaking.roomNotFound"));
      return;
    }
    router.push(`${href("/play")}?mode=${mode}&code=${c.toLowerCase()}`);
  }

  return (
    <Panel id="play" className="scroll-mt-24" title={t("lobby.playTitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick match: the large tile, and the screen's one glow */}
        <div className="panel panel-2 flex flex-col justify-between gap-4 md:row-span-2">
          <div>
            <Swords className="ico mb-3 c-magenta !h-6 !w-6" aria-hidden />
            <h3 className="t-title">{t("lobby.quickMatch")}</h3>
            <p className="muted">{t("lobby.quickMatchBody")}</p>
          </div>
          <Button asChild variant="primary" size="lg" glow="md" block>
            <Link href={`${href("/play")}?mode=quick`} className="no-underline">
              <Gamepad2 className="ico" aria-hidden />
              {t("lobby.findMatch")}
            </Link>
          </Button>
        </div>

        {/* Private room */}
        <div className="panel panel-2 stack stack-3">
          <div className="row">
            <Lock className="ico c-cyan" aria-hidden />
            <h3 className="t-heading">{t("lobby.privateRoom")}</h3>
          </div>
          <p className="muted t-caption">{t("lobby.privateRoomBody")}</p>
          <Button asChild size="sm">
            <Link href={`${href("/play")}?mode=create`} className="no-underline">
              {t("lobby.createRoom")}
            </Link>
          </Button>
          <form className="stack" onSubmit={(e) => join(e, joinCode, setJoinError, "join")} noValidate>
            <div className="flex flex-wrap gap-2 [&>.input]:min-w-0 [&>.input]:flex-1">
              <Input
                aria-label={t("lobby.roomCode")}
                placeholder={t("lobby.roomCodePlaceholder")}
                mono
                maxLength={8}
                invalid={!!joinError}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value);
                  setJoinError(undefined);
                }}
              />
              <Button size="sm" type="submit">
                {t("lobby.joinRoom")}
              </Button>
            </div>
            {joinError && (
              <p className="field-error" role="alert">
                {joinError}
              </p>
            )}
          </form>
        </div>

        {/* Tournament */}
        <div className="panel panel-2 stack stack-3">
          <div className="row">
            <Trophy className="ico c-amber" aria-hidden />
            <h3 className="t-heading">{t("lobby.tournament")}</h3>
          </div>
          <p className="muted t-caption">{t("lobby.tournamentBody")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label={t("tournament.players", { n: size, max: 8 })} value={size} onChange={setSize} options={[4, 6, 8].map((n) => ({ value: n, label: String(n) }))} mono />
            <Button asChild size="sm">
              <Link href={`${href("/play")}?mode=tournament-create&size=${size}`} className="no-underline">
                {t("tournament.create")}
              </Link>
            </Button>
          </div>
          <form className="stack" onSubmit={(e) => join(e, tCode, setTError, "tournament-join")} noValidate>
            <div className="flex flex-wrap gap-2 [&>.input]:min-w-0 [&>.input]:flex-1">
              <Input
                aria-label={t("lobby.roomCode")}
                placeholder={t("lobby.roomCodePlaceholder")}
                mono
                maxLength={8}
                invalid={!!tError}
                value={tCode}
                onChange={(e) => {
                  setTCode(e.target.value);
                  setTError(undefined);
                }}
              />
              <Button size="sm" type="submit">
                {t("tournament.join")}
              </Button>
            </div>
            {tError && (
              <p className="field-error" role="alert">
                {tError}
              </p>
            )}
          </form>
        </div>

        {/* Local + vs AI */}
        <Link href={href("/local")} className="panel panel-2 row row-3 no-underline text-fg hover:border-border-strong">
          <Keyboard className="ico c-cyan" aria-hidden />
          <div>
            <h3 className="t-heading">{t("lobby.local")}</h3>
            <p className="muted t-caption">{t("lobby.localBody")}</p>
          </div>
        </Link>
        <Link href={`${href("/local")}?mode=ai`} className="panel panel-2 row row-3 no-underline text-fg hover:border-border-strong">
          <Bot className="ico c-cyan" aria-hidden />
          <div>
            <h3 className="t-heading">{t("lobby.vsAi")}</h3>
            <p className="muted t-caption">{t("lobby.vsAiBody")}</p>
          </div>
        </Link>
      </div>
    </Panel>
  );
}

function StatsPanel({ username }: { username?: string }) {
  const { t } = useI18n();
  const { data, error, mutate } = useSWR<Profile>(username ? `/api/users/${username}` : null);
  const tiles = data
    ? [
        { k: t("lobby.wins"), v: data.stats.wins, c: "c-green" },
        { k: t("lobby.losses"), v: data.stats.losses, c: "c-red" },
        { k: t("lobby.winRate"), v: `${Math.round(data.stats.winRate * 100)}%`, c: "" },
        { k: t("lobby.streak"), v: data.stats.currentStreak > 0 ? `+${data.stats.currentStreak}` : String(data.stats.currentStreak), c: data.stats.currentStreak > 0 ? "c-green" : data.stats.currentStreak < 0 ? "c-red" : "" },
      ]
    : null;
  return (
    <Panel title={t("lobby.statsTitle")}>
      {error && !data ? (
        <LoadError onRetry={() => mutate()} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(tiles ?? Array.from({ length: 4 }, () => null)).map((tile, i) => (
            <div key={i} className="rounded-md border border-border bg-surface-2 p-3">
              {tile ? (
                <>
                  <p className="t-label subtle">{tile.k}</p>
                  <p className={`num num-lg ${tile.c}`}>{tile.v}</p>
                </>
              ) : (
                <>
                  <Skeleton style={{ width: 60 }} />
                  <Skeleton className="mt-2" style={{ width: 48, height: 32 }} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function RecentPanel({ username }: { username?: string }) {
  const { t, href } = useI18n();
  const { data, error, mutate } = useSWR<Page<MatchSummary>>(username ? `/api/users/${username}/matches?pageSize=3` : null);
  return (
    <Panel
      title={t("lobby.recentTitle")}
      actions={
        username && data?.total ? (
          <Link href={href(`/profile/${username}`)} className="t-label">
            {t("common.seeAll")}
          </Link>
        ) : undefined
      }
    >
      {error && !data ? (
        <LoadError onRetry={() => mutate()} />
      ) : !data ? (
        <div className="stack">
          <MatchCardSkeleton />
          <MatchCardSkeleton />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title={t("profile.noHistory")} body={t("lobby.noMatches")} />
      ) : (
        <div className="stack">
          {data.items.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function FriendsSidebar() {
  const { t, href } = useI18n();
  const friends = useSWR<PublicUser[]>("/api/friends", { refreshInterval: 15000 });
  const requests = useSWR<FriendRequest[]>("/api/friends/requests");
  const received = (requests.data ?? []).filter((r) => r.direction === "received");
  const groups = (["ONLINE", "INGAME", "OFFLINE"] as const).map((p) => ({ p, list: (friends.data ?? []).filter((f) => f.presence === p) }));

  return (
    <aside aria-label={t("lobby.friendsTitle")} className="lg:sticky lg:top-24 lg:self-start">
      <Panel
        title={
          <h2 className="t-heading row">
            {t("lobby.friendsTitle")}
            <CountBadge count={received.length} label={t("lobby.requests")} />
          </h2>
        }
        actions={
          <Link href={href("/friends")} className="icon-btn" aria-label={t("lobby.findPlayers")} title={t("lobby.findPlayers")}>
            <UserPlus className="ico" aria-hidden />
          </Link>
        }
      >
        {received.length > 0 && (
          <div className="mb-4">
            <p className="t-label subtle mb-2">{t("lobby.requests")}</p>
            {received.map((r) => (
              <Link key={r.id} href={href("/friends")} className="list-row no-underline text-fg">
                <PlayerChip user={r.user} link={false} meta={t("friends.received")} showPresence={false} />
              </Link>
            ))}
          </div>
        )}
        {friends.error && !friends.data ? (
          <LoadError onRetry={() => friends.mutate()} />
        ) : !friends.data ? (
          <div className="stack">
            {[0, 1, 2].map((i) => (
              <div key={i} className="row px-3 py-2">
                <Skeleton circle />
                <Skeleton style={{ width: 120 }} />
              </div>
            ))}
          </div>
        ) : friends.data.length === 0 ? (
          <EmptyState
            title={t("lobby.noFriends")}
            action={
              <Button asChild size="sm">
                <Link href={href("/friends")} className="no-underline">
                  {t("lobby.findPlayers")}
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="stack stack-4">
            {groups
              .filter((g) => g.list.length)
              .map((g) => (
                <div key={g.p}>
                  <p className="t-label subtle mb-1">
                    {t(`presence.${g.p}`)} · {g.list.length}
                  </p>
                  {g.list.map((f) => (
                    <div key={f.id} className="list-row">
                      <div className="grow min-w-0">
                        <PlayerChip user={f} />
                      </div>
                      {f.presence === "ONLINE" && (
                        <Link href={`${href("/play")}?mode=create&invite=${encodeURIComponent(f.username)}`} className="icon-btn icon-btn-sm" aria-label={`${t("lobby.invite")}: ${f.displayName}`} title={t("lobby.invite")}>
                          <Gamepad2 className="ico" aria-hidden />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </Panel>
    </aside>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="stack items-start" role="alert">
      <p className="muted">{t("lobby.loadError")}</p>
      <Button size="sm" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
