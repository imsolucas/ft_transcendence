"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Ban, Check, Gamepad2, MessageSquare, MoreHorizontal, Pencil, UserMinus, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError, api, fetcher } from "@/lib/api";
import type { FriendRequest, Profile } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger, Modal } from "@/components/ui/primitives";

type Busy = null | "add" | "cancel" | "accept" | "decline" | "remove" | "block" | "unblock";

/** Header actions: own profile → Edit; another player → actions by friendship state. */
export function ProfileActions({ profile, isOwn, profileKey }: { profile: Profile; isOwn: boolean; profileKey: string }) {
  const { t, href } = useI18n();
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<null | "remove" | "block">(null);

  const { friendship, username, displayName: name } = profile;
  const needsRequest = !isOwn && (friendship === "request_sent" || friendship === "request_received");
  const requests = useSWR<FriendRequest[]>(needsRequest ? "/api/friends/requests" : null, fetcher);
  const direction = friendship === "request_sent" ? "sent" : "received";
  const request = requests.data?.find((r) => r.direction === direction && r.user.username === username);

  if (isOwn) {
    return (
      <div className="row wrap">
        <Button asChild>
          <Link href={href("/settings")} className="no-underline">
            <Pencil className="ico" aria-hidden />
            {t("profile.editProfile")}
          </Link>
        </Button>
      </div>
    );
  }

  const errorText = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 0) return t("common.networkError");
      if ((err.status === 404 || err.status === 409) && err.message) return err.message;
    }
    return t("common.error");
  };

  async function run(kind: Exclude<Busy, null>, action: () => Promise<unknown>, success: string) {
    setBusy(kind);
    try {
      await action();
      toast.success(success);
      setConfirm(null);
      await Promise.all([mutate(profileKey), mutate("/api/friends"), mutate("/api/friends/requests"), mutate("/api/blocks")]);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  const user = encodeURIComponent(username);
  const add = () => run("add", () => api.post("/api/friends/requests", { username }), t("friends.added", { name }));
  const cancel = () => request && run("cancel", () => api.del(`/api/friends/requests/${request.id}`), t("friends.cancelled"));
  const accept = () => request && run("accept", () => api.post(`/api/friends/requests/${request.id}/accept`), t("friends.accepted", { name }));
  const decline = () => request && run("decline", () => api.post(`/api/friends/requests/${request.id}/decline`), t("friends.declined"));
  const remove = () => run("remove", () => api.del(`/api/friends/${user}`), t("friends.removed", { name }));
  const block = () => run("block", () => api.post("/api/blocks", { username }), t("friends.blocked", { name }));
  const unblock = () => run("unblock", () => api.del(`/api/blocks/${user}`), t("friends.unblocked", { name }));

  // The request id comes from a second fetch: wait for it, and offer a retry if it fails
  const requestPending = needsRequest && !request && requests.isLoading;
  const requestMissing = needsRequest && !request && !requests.isLoading;

  return (
    <div className="row wrap">
      {friendship === "none" && (
        <Button variant="primary" glow="sm" className="max-sm:w-full" loading={busy === "add"} onClick={add}>
          <UserPlus className="ico" aria-hidden />
          {t("profile.addFriend")}
        </Button>
      )}

      {friendship === "request_sent" && (
        <>
          <Button disabled>
            <Check className="ico" aria-hidden />
            {t("profile.requestSent")}
          </Button>
          {requestMissing ? (
            <Button variant="ghost" onClick={() => requests.mutate()}>
              {t("common.retry")}
            </Button>
          ) : (
            <Button variant="ghost" loading={busy === "cancel" || requestPending} disabled={!request || busy !== null} onClick={cancel}>
              {t("profile.cancelRequest")}
            </Button>
          )}
        </>
      )}

      {friendship === "request_received" &&
        (requestMissing ? (
          <Button onClick={() => requests.mutate()}>{t("common.retry")}</Button>
        ) : (
          <>
            <Button variant="primary" glow="sm" className="max-sm:w-full" loading={busy === "accept" || requestPending} disabled={!request || busy !== null} onClick={accept}>
              <Check className="ico" aria-hidden />
              {t("profile.acceptRequest")}
            </Button>
            <Button variant="ghost" loading={busy === "decline"} disabled={!request || busy !== null} onClick={decline}>
              {t("friends.decline")}
            </Button>
          </>
        ))}

      {friendship === "friends" && (
        <>
          <Button asChild variant="primary" glow="sm" className="max-sm:w-full">
            <Link href={`${href("/play")}?mode=create&invite=${user}`} className="no-underline">
              <Gamepad2 className="ico" aria-hidden />
              {t("lobby.invite")}
            </Link>
          </Button>
          <Button asChild>
            <Link href={href("/chat")} className="no-underline">
              <MessageSquare className="ico" aria-hidden />
              {t("profile.message")}
            </Link>
          </Button>
          {/* At phone width Remove friend moves into the More menu so the row fits */}
          <Button variant="ghost" className="max-sm:!hidden" disabled={busy !== null} onClick={() => setConfirm("remove")}>
            {t("profile.removeFriend")}
          </Button>
        </>
      )}

      {friendship === "blocked" && (
        <Button loading={busy === "unblock"} onClick={unblock}>
          {t("profile.unblock")}
        </Button>
      )}

      {friendship !== "blocked" && (
        <Menu modal={false}>
          <MenuTrigger asChild>
            <IconButton label={t("friends.more")} bordered disabled={busy !== null}>
              <MoreHorizontal className="ico" aria-hidden />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            {friendship === "friends" && (
              <MenuItem className="sm:!hidden" onSelect={() => setConfirm("remove")}>
                <UserMinus className="ico" aria-hidden />
                {t("profile.removeFriend")}
              </MenuItem>
            )}
            <MenuItem danger onSelect={() => setConfirm("block")}>
              <Ban className="ico" aria-hidden />
              {t("profile.block")}
            </MenuItem>
          </MenuContent>
        </Menu>
      )}

      <Modal
        open={confirm === "remove"}
        onOpenChange={(open) => !open && busy === null && setConfirm(null)}
        title={t("profile.removeFriend")}
        description={t("profile.removeFriendConfirm", { name })}
        actions={
          <>
            <Button onClick={() => setConfirm(null)} disabled={busy !== null}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={busy === "remove"} onClick={remove}>
              {t("profile.removeFriend")}
            </Button>
          </>
        }
      />
      <Modal
        open={confirm === "block"}
        onOpenChange={(open) => !open && busy === null && setConfirm(null)}
        title={t("profile.block")}
        description={t("profile.blockConfirm", { name })}
        actions={
          <>
            <Button onClick={() => setConfirm(null)} disabled={busy !== null}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={busy === "block"} onClick={block}>
              <Ban className="ico" aria-hidden />
              {t("profile.block")}
            </Button>
          </>
        }
      />
    </div>
  );
}
