"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/primitives";

/** Placeholder until the chat service lands (Phase 3). */
export function ChatView() {
  const { t, href } = useI18n();
  return (
    <div className="stack stack-5">
      <h1 className="pix pix-md">{t("chat.title")}</h1>
      <Panel>
        <EmptyState
          icon={<MessageSquare className="ico" aria-hidden />}
          title={t("nav.chat")}
          body={t("chat.comingSoon")}
          action={
            <Button asChild>
              <Link href={href("/friends")} className="no-underline">
                {t("nav.friends")}
              </Link>
            </Button>
          }
        />
      </Panel>
    </div>
  );
}
