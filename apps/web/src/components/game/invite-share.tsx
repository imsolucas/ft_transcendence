"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Copy, Link2, Share2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { inviteUrl } from "@/lib/invite";
import { Button } from "@/components/ui/button";

const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const subscribe = () => () => {};

/** Room code + "copy invite link" (+ the native share sheet where there is one). */
export function InviteShare({ code, kind = "match" }: { code: string; kind?: "match" | "tournament" }) {
  const { t } = useI18n();
  // navigator.share exists only in the browser (and mostly on phones): read it after hydration
  const share = useSyncExternalStore(subscribe, canShare, () => false);

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="stack items-center !gap-3">
      <div className="row justify-center">
        <span className="num num-lg tracking-widest" aria-label={code.split("").join(" ")}>
          {code.toUpperCase()}
        </span>
        <Button size="sm" variant="ghost" onClick={() => copy(code.toUpperCase(), t("invite.codeCopied"))}>
          <Copy className="ico" aria-hidden /> {t("common.copy")}
        </Button>
      </div>
      <div className="row wrap justify-center !gap-2">
        <Button size="sm" variant="secondary" onClick={() => copy(inviteUrl(code, kind), t("invite.linkCopied"))}>
          <Link2 className="ico" aria-hidden /> {t("invite.copyLink")}
        </Button>
        {share && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigator.share({ title: t("invite.shareTitle"), text: t("invite.shareText"), url: inviteUrl(code, kind) }).catch(() => {})}
          >
            <Share2 className="ico" aria-hidden /> {t("invite.share")}
          </Button>
        )}
      </div>
    </div>
  );
}
