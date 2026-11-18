"use client";

import Link from "next/link";
import { TickNumber } from "@/components/arcade/tick-number";
import { Bit } from "@/components/arcade/bit";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { ApiError, api, fetcher } from "@/lib/api";
import { toast } from "sonner";
import { Bot, Gamepad2, Keyboard, Lock, Swords, Trophy, UserPlus, Eye, Users, CalendarDays, Joystick, Coins } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "@/lib/session";
import type { CoinsInfo, CoinsResult, FriendRequest, MatchSummary, Page, Profile, PublicUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { CountBadge, EmptyState, Panel, Segmented, Skeleton } from "@/components/ui/primitives";
import { RankedStandingLine, useSeasonLabel } from "@/components/game/ranked";
import type { RankedMe } from "@/lib/types";
import { MatchCard, MatchCardSkeleton, PlayerChip } from "@/components/game/cards";

const ROOM_CODE = /^[0-9a-f]{8}$/i;

export function LobbyView() {
  const { t } = useI18n();
  const { me } = useMe();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="stack stack-5 min-w-0">
        <div className="flex items-center gap-3">
          <Bit size={48} />
          <div>
            <h1 className="pix pix-md">{t("lobby.title")}</h1>
            {me && <p className="muted mt-1">{t("lobby.greeting", { name: me.displayName })}</p>}
          </div>
        </div>
        <ArcadeBanner />
        <PlayPanel />
        <div className="grid gap-5 xl:grid-cols-2">
          <StatsPanel username={me?.username} />
          <RecentPanel username={me?.username} />
        </div>
      </div>
      <div className="stack stack-5 min-w-0">
        <QuestsPanel />
        <FriendsSidebar />
      </div>
    </div>
  );
}

/** today's 3 quests (the same for everyone): progress from play, collect the coins */
function QuestsPanel() {
  const { t } = useI18n();
  const { data, error, mutate } = useSWR<CoinsInfo>("/api/me/coins", fetcher, { revalidateOnFocus: true });
  const [claiming, setClaiming] = useState<string | null>(null);
  const claim = async (id: string) => {
    setClaiming(id);
    try {
      const res = await api.post<CoinsResult>(`/api/quests/${id}/claim`);
      toast.success(t("quests.collected", { n: data?.quests.find((q) => q.id === id)?.reward ?? 0 }));
      await mutate(data ? { ...data, balance: res.balance, quests: data.quests.map((q) => (q.id === id ? { ...q, claimed: true } : q)) } : undefined, { revalidate: true });
    } catch (err) {
      // collected already (another tab, a double click): just show the real state
      if (err instanceof ApiError && err.status === 409) {
        toast(t("quests.already"));
        void mutate();
      } else toast.error(err instanceof ApiError && err.status === 0 ? t("common.networkError") : t("common.error"));
    } finally {
      setClaiming(null);
    }
  };
  return (
    <Panel>
      <div className="row between mb-3">
        <h2 className="t-heading">{t("quests.title")}</h2>
        <span className="row t-label !gap-1" aria-label={t("quests.balance", { n: data?.balance ?? 0 })}>
          <Coins className="ico c-amber" aria-hidden />
          <span className="num">{data?.balance ?? "—"}</span>
        </span>
      </div>
      {!data ? (
        error ? (
          <Button size="sm" onClick={() => mutate()}>
            {t("common.retry")}
          </Button>
        ) : (
          <div className="stack !gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )
      ) : (
        <ul className="stack !gap-3">
          {data.quests.map((q) => (
            <li key={q.id} className="stack !gap-1">
              <div className="row between !gap-2">
                <span className={q.claimed ? "t-caption subtle line-through" : "t-caption"}>{t(`quests.q.${q.id}`, { n: q.target })}</span>
                {q.done && !q.claimed ? (
                  <Button size="sm" variant="primary" loading={claiming === q.id} onClick={() => claim(q.id)}>
                    <Coins className="ico" aria-hidden />+{q.reward}
                  </Button>
                ) : (
                  <span className="t-caption subtle num">{q.claimed ? t("quests.done") : `+${q.reward}`}</span>
                )}
              </div>
              <div className="quest-bar" role="progressbar" aria-valuemin={0} aria-valuemax={q.target} aria-valuenow={q.progress} aria-label={t(`quests.q.${q.id}`, { n: q.target })}>
                <span style={{ width: `${(q.progress / q.target) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="t-caption subtle mt-3">{t("quests.hint")}</p>
    </Panel>
  );
}

/** the front door to the arcade hall (the lobby below stays the quick way to play) */
function ArcadeBanner() {
  const { t, href } = useI18n();
  return (
    <Link href={href("/arcade")} className="panel row between wrap !gap-4 no-underline text-fg hover:border-neon-magenta">
      <span className="row !gap-3">
        <Joystick className="ico c-magenta" aria-hidden />
        <span>
          <span className="t-heading block">{t("arcade.lobbyBanner")}</span>
          <span className="muted t-caption">{t("arcade.lobbyBannerBody")}</span>
        </span>
      </span>
      <span className="btn btn-primary btn-sm">{t("arcade.enter")}</span>
    </Link>
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
  const [pCode, setPCode] = useState("");
  const [pError, setPError] = useState<string>();

  function join(e: FormEvent, code: string, setErr: (s?: string) => void, mode: string, path = "/play") {
    e.preventDefault();
    const c = code.trim();
    if (!ROOM_CODE.test(c)) {
      setErr(t("matchmaking.roomNotFound"));
      return;
    }
    router.push(`${href(path)}?mode=${mode}&code=${c.toLowerCase()}`);
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
            <div className="mt-3 stack !gap-1">
              <RankedStandingLine path="/api/ranked/me" />
              <SeasonCaption />
            </div>
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
            <Segmented label={t("lobby.tournamentSize")} value={size} onChange={setSize} options={[4, 6, 8].map((n) => ({ value: n, label: String(n) }))} mono />
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

        {/* Party: 3–4 players on one square court */}
        <div className="panel panel-2 stack stack-3">
          <div className="row">
            <Users className="ico c-green" aria-hidden />
            <h3 className="t-heading">{t("party.lobbyCard")}</h3>
          </div>
          <p className="muted t-caption">{t("party.lobbyCardBody")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`${href("/party")}?mode=quick`} className="no-underline">
                {t("party.quick")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`${href("/party")}?mode=create`} className="no-underline">
                {t("party.create")}
              </Link>
            </Button>
          </div>
          {/* Light Cycles: the same party rooms (a code joins either game), 2–4 riders */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-label c-cyan">{t("cycles.title")}</span>
            <Button asChild size="sm">
              <Link href={`${href("/party")}?game=cycles&mode=quick`} className="no-underline">
                {t("cycles.quick")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`${href("/party")}?game=cycles&mode=create`} className="no-underline">
                {t("party.create")}
              </Link>
            </Button>
          </div>
          <form className="stack" onSubmit={(e) => join(e, pCode, setPError, "join", "/party")} noValidate>
            <div className="flex flex-wrap gap-2 [&>.input]:min-w-0 [&>.input]:flex-1">
              <Input
                aria-label={t("party.codeLabel")}
                placeholder={t("lobby.roomCodePlaceholder")}
                mono
                maxLength={8}
                invalid={!!pError}
                value={pCode}
                onChange={(e) => {
                  setPCode(e.target.value);
                  setPError(undefined);
                }}
              />
              <Button size="sm" type="submit">
                {t("party.join")}
              </Button>
            </div>
            {pError && (
              <p className="field-error" role="alert">
                {pError}
              </p>
            )}
          </form>
        </div>

        {/* Local + vs AI: stacked in the column next to Party, each at its own height */}
        <div className="grid content-start gap-4">
        <Link href={href("/daily")} className="panel panel-2 row !gap-3 no-underline text-fg hover:border-border-strong">
          <CalendarDays className="ico c-amber" aria-hidden />
          <div>
            <h3 className="t-heading">{t("daily.lobbyTile")}</h3>
            <p className="muted t-caption">{t("daily.lobbyTileBody")}</p>
          </div>
        </Link>
        <Link href={href("/local")} className="panel panel-2 row !gap-3 no-underline text-fg hover:border-border-strong">
          <Keyboard className="ico c-cyan" aria-hidden />
          <div>
            <h3 className="t-heading">{t("lobby.local")}</h3>
            <p className="muted t-caption">{t("lobby.localBody")}</p>
          </div>
        </Link>
        <Link href={`${href("/local")}?mode=ai`} className="panel panel-2 row !gap-3 no-underline text-fg hover:border-border-strong">
          <Bot className="ico c-cyan" aria-hidden />
          <div>
            <h3 className="t-heading">{t("lobby.vsAi")}</h3>
            <p className="muted t-caption">{t("lobby.vsAiBody")}</p>
          </div>
        </Link>
        </div>
      </div>
      <div className="row wrap mt-4 !gap-x-6">
        <Link href={href("/leaderboard")} className="row t-label">
          <Trophy className="ico c-amber" aria-hidden />
          {t("leaderboard.lobbyLink")}
        </Link>
        <Link href={href("/watch")} className="row t-label">
          <Eye className="ico c-cyan" aria-hidden />
          {t("watch.inLobby")}
        </Link>
        <Link href={href("/coach")} className="row t-label">
          <Bot className="ico c-cyan" aria-hidden />
          {t("coach.title")}
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
                  <p className={`num num-lg ${tile.c}`}>{typeof tile.v === "number" ? <TickNumber value={tile.v} /> : tile.v}</p>
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

/** "Season 1 · ends in 12 days" (shares the /api/ranked/me request with the standing line) */
function SeasonCaption() {
  const { data } = useSWR<RankedMe>("/api/ranked/me", fetcher, { revalidateOnFocus: false });
  const label = useSeasonLabel(data?.season);
  return label ? <span className="t-caption subtle">{label}</span> : null;
}
