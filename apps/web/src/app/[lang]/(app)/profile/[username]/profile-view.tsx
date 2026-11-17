"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { AlertTriangle, Lock, UserX, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError, fetcher } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { MatchSummary, Page, Presence, Profile, PublicUser } from "@/lib/types";
import { Avatar, Badge, EmptyState, Panel, PresenceDot, Skeleton, Tab, TabPanel, Tabs, TabsList } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { MatchCard, MatchCardSkeleton, Pager, PlayerChip } from "@/components/game/cards";
import { ProfileActions } from "./profile-actions";
import { ProfileStats } from "./profile-stats";
import { Achievements } from "./achievements";

const PAGE_SIZE = 10;

const noRetryOn = (...statuses: number[]) => ({
  shouldRetryOnError: (err: unknown) => !(err instanceof ApiError && statuses.includes(err.status)),
});

/** Error panel with an in-place retry (design: red mark, role="alert"). */
export function LoadError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  const { t } = useI18n();
  const body = error instanceof ApiError && error.status === 0 ? t("common.networkError") : t("common.error");
  return (
    <div role="alert">
      <EmptyState
        icon={<AlertTriangle className="ico c-red" aria-hidden />}
        title={title}
        body={body}
        action={
          <Button type="button" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 max-sm:gap-4" aria-busy="true">
      <section className="panel">
        <div className="flex flex-wrap items-center gap-6 max-sm:gap-3">
          <Skeleton circle className="!h-24 !w-24 max-sm:!h-16 max-sm:!w-16" />
          <div className="stack grow">
            <Skeleton className="!h-6" style={{ width: 180 }} />
            <Skeleton style={{ width: 140 }} />
            <Skeleton className="!h-2.5" style={{ width: 120 }} />
          </div>
        </div>
      </section>
      <Skeleton className="!h-11 w-full" />
      <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="!h-[90px] w-full" />
        ))}
      </div>
    </div>
  );
}

/** Route entry: re-mount per username so tab, page and modals don't carry across profiles. */
export function ProfileView() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username ?? "").toLowerCase();
  return <ProfileScreen key={username} username={username} />;
}

const PRESENCE_TONE: Record<Presence, "green" | "cyan" | undefined> = { ONLINE: "green", INGAME: "cyan", OFFLINE: undefined };

function ProfileScreen({ username }: { username: string }) {
  const { t, href, locale } = useI18n();
  const { me, isLoading: meLoading } = useMe();
  const profileKey = `/api/users/${encodeURIComponent(username)}`;
  const { data: profile, error, isLoading, mutate } = useSWR<Profile>(profileKey, fetcher, noRetryOn(401, 404));

  const [page, setPage] = useState(1);
  const matchesKey = profile ? `${profileKey}/matches?page=${page}&pageSize=${PAGE_SIZE}` : null;
  const matches = useSWR<Page<MatchSummary>>(matchesKey, fetcher, { keepPreviousData: true, ...noRetryOn(401, 404) });

  const isOwn = !!me && !!profile && me.username === profile.username;
  const friends = useSWR<PublicUser[]>(isOwn ? "/api/friends" : null, fetcher, noRetryOn(401));

  if (isLoading && !profile) return <ProfileSkeleton />;

  if (error && !profile) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="sr-only">{t("profile.notFound")}</h1>
          <Panel>
            <EmptyState
              icon={<UserX className="ico" aria-hidden />}
              title={t("profile.notFound")}
              body={t("profile.notFoundBody")}
              action={
                <Button asChild>
                  <Link href={href("/lobby")} className="no-underline">
                    {t("common.backToLobby")}
                  </Link>
                </Button>
              }
            />
          </Panel>
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-[1120px]">
        <h1 className="sr-only">{t("profile.loadError")}</h1>
        <Panel>
          <LoadError title={t("profile.loadError")} error={error} onRetry={() => mutate()} />
        </Panel>
      </div>
    );
  }
  if (!profile) return <ProfileSkeleton />;

  const { stats } = profile;
  const played = stats.wins + stats.losses;
  const pct = played ? `${Math.round(stats.winRate * 100)}%` : "–";
  const since = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(profile.memberSince));
  const presenceWord = t(`presence.${profile.presence}`);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 max-sm:gap-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-6 max-sm:gap-3">
          <Avatar name={profile.displayName} src={profile.avatar} size="xl" className="max-sm:!h-16 max-sm:!w-16 max-sm:!text-[20px]" />
          <div className="stack min-w-0 flex-1 basis-48 !gap-1">
            <h1 className="pix pix-md !normal-case break-words">{profile.displayName}</h1>
            <span className="t-label muted">@{profile.username}</span>
            <span className="row wrap">
              <Badge tone={PRESENCE_TONE[profile.presence]} icon={<PresenceDot presence={profile.presence} inline />}>
                {presenceWord}
              </Badge>
              <span className="num num-md muted">
                {t("profile.record", { wins: stats.wins, losses: stats.losses })} · {pct}
              </span>
            </span>
            <span className="t-caption subtle">{t("profile.memberSince", { date: since })}</span>
          </div>
          {!meLoading && me && (
            <div className="max-sm:w-full">
              <ProfileActions profile={profile} isOwn={isOwn} profileKey={profileKey} />
            </div>
          )}
        </div>
        {profile.friendship === "blocked_you" && <p className="t-label muted mt-4">{t("profile.blockedYou")}</p>}
      </Panel>

      <Tabs defaultValue="stats" className="flex flex-col gap-6 max-sm:gap-4">
        <TabsList aria-label={t("nav.profile")}>
          <Tab value="stats">{t("profile.tabs.stats")}</Tab>
          <Tab value="achievements">
            {t("profile.tabs.achievements")}
            <span className="count">
              {profile.achievements.filter((a) => a.unlocked).length}
            </span>
          </Tab>
          <Tab value="history">
            {t("profile.tabs.history")}
            {matches.data && <span className="count">{matches.data.total}</span>}
          </Tab>
          <Tab value="friends">
            {t("profile.tabs.friends")}
            {friends.data && <span className="count">{friends.data.length}</span>}
          </Tab>
        </TabsList>

        <TabPanel value="stats" className="outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]">
          <ProfileStats stats={stats} />
        </TabPanel>

        <TabPanel value="achievements" className="outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]">
          <Achievements items={profile.achievements} />
        </TabPanel>

        <TabPanel value="history" className="outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]">
          <MatchHistory isOwn={isOwn} query={matches} page={page} onPage={setPage} />
        </TabPanel>

        <TabPanel value="friends" className="outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]">
          {isOwn ? (
            <FriendsList query={friends} />
          ) : (
            <Panel>
              <EmptyState
                icon={<Lock className="ico" aria-hidden />}
                title={t("profile.friendsPrivate")}
                body={t("profile.friendsPrivateBody", { name: profile.displayName })}
              />
            </Panel>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

function MatchHistory({
  isOwn,
  query,
  page,
  onPage,
}: {
  isOwn: boolean;
  query: ReturnType<typeof useSWR<Page<MatchSummary>>>;
  page: number;
  onPage: (p: number) => void;
}) {
  const { t, href } = useI18n();
  const { data, error, isLoading, mutate } = query;

  if (error && !data) {
    return (
      <Panel>
        <LoadError title={t("profile.historyError")} error={error} onRetry={() => mutate()} />
      </Panel>
    );
  }
  if (isLoading && !data) {
    return (
      <div className="stack" aria-busy="true" aria-label={t("common.loading")}>
        {[0, 1, 2, 3].map((i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (!data || data.total === 0) {
    return (
      <Panel>
        <EmptyState
          title={t("profile.noHistory")}
          body={t("profile.noHistoryBody")}
          action={
            isOwn ? (
              <Button asChild>
                <Link href={href("/lobby#play")} className="no-underline">
                  {t("lobby.findMatch")}
                </Link>
              </Button>
            ) : undefined
          }
        />
      </Panel>
    );
  }
  return (
    <div aria-busy={isLoading || undefined}>
      <ul className="stack">
        {data.items.map((m) => (
          <li key={m.id}>
            <MatchCard match={m} />
          </li>
        ))}
      </ul>
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={onPage} />
    </div>
  );
}

function FriendsList({ query }: { query: ReturnType<typeof useSWR<PublicUser[]>> }) {
  const { t, href } = useI18n();
  const { data, error, isLoading, mutate } = query;

  if (error && !data) {
    return (
      <Panel>
        <LoadError title={t("lobby.loadError")} error={error} onRetry={() => mutate()} />
      </Panel>
    );
  }
  if (isLoading && !data) {
    return (
      <Panel>
        <div className="stack stack-3" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="row row-3">
              <Skeleton circle />
              <span className="stack grow">
                <Skeleton style={{ width: "40%" }} />
                <Skeleton className="!h-2.5" style={{ width: "24%" }} />
              </span>
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  if (!data || data.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<Users className="ico" aria-hidden />}
          title={t("lobby.noFriends")}
          action={
            <Button asChild>
              <Link href={href("/friends")} className="no-underline">
                {t("lobby.findPlayers")}
              </Link>
            </Button>
          }
        />
      </Panel>
    );
  }
  return (
    <Panel>
      <ul className="grid grid-cols-2 gap-1 max-sm:grid-cols-1">
        {data.map((u) => (
          <li key={u.id} className="list-row">
            <PlayerChip user={u} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
