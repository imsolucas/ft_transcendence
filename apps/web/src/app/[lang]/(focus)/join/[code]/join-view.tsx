"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link2Off } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel, Spinner } from "@/components/ui/primitives";
import { ROOM_CODE } from "@/lib/invite";

/**
 * /join/<code>[?kind=tournament]: an invite link. Signed-out visitors were already sent through
 * login/signup by proxy.ts (with ?next= back here); this page forwards to the room.
 */
export function JoinView() {
  const { t, href } = useI18n();
  const router = useRouter();
  const { code: raw } = useParams<{ code: string }>();
  const tournament = useSearchParams().get("kind") === "tournament";
  const code = (raw ?? "").toLowerCase();
  const valid = ROOM_CODE.test(code);

  useEffect(() => {
    if (valid) router.replace(`${href("/play")}?mode=${tournament ? "tournament-join" : "join"}&code=${code}`);
  }, [valid, tournament, code, router, href]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      {valid ? (
        <p className="row !gap-2 muted" role="status">
          <Spinner /> {t("invite.joining")}
        </p>
      ) : (
        <Panel className="w-full max-w-[440px]">
          <EmptyState icon={<Link2Off className="ico" aria-hidden />} title={t("invite.invalid")} body={t("invite.invalidBody")} />
          <div className="mt-4 flex justify-center">
            <Button asChild variant="primary">
              <Link href={href("/lobby")} className="no-underline">
                {t("landing.goToLobby")}
              </Link>
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
