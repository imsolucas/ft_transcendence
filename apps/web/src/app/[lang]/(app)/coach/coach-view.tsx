"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Bot, Send, Square, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetcher } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AiStatus, CoachRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/form";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";

type Turn = CoachRequest["messages"][number];
const MAX_HISTORY = 20; // the server accepts at most 20 entries
const SUGGESTIONS = ["coach.suggestAngles", "coach.suggestAi", "coach.suggestTournament"] as const;

/** Reads "event: …\ndata: …\n\n" frames from a streamed fetch response. */
async function* sse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = frame.match(/^event: (.*)$/m)?.[1];
      const data = frame.match(/^data: (.*)$/m)?.[1];
      if (event && data) yield { event, data: JSON.parse(data) as Record<string, unknown> };
    }
  }
}

/** The AI coach: a streaming chat about Pong tactics and the site. */
export function CoachView() {
  const { t } = useI18n();
  const { data: status, mutate: refreshStatus } = useSWR<AiStatus>("/api/ai/status", fetcher);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const errorText = (code: string) =>
    ({
      LIMIT: t("coach.errLimit"),
      AI_DISABLED: t("coach.disabledBody"),
      RATE_LIMITED: t("coach.errBusy"),
      OVERLOADED: t("coach.errBusy"),
      UNAVAILABLE: t("coach.errUnavailable"),
    })[code] ?? t("common.error");

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError(undefined);
    const history = [...turns, { role: "user" as const, content: question }].slice(-MAX_HISTORY);
    // the history must start with the player
    while (history[0]?.role === "assistant") history.shift();
    setTurns([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    const abort = new AbortController();
    abortRef.current = abort;
    let answer = "";
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history } satisfies CoachRequest),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { code?: string };
        throw new Error(body.code ?? "ERROR");
      }
      for await (const { event, data } of sse(res.body)) {
        if (event === "delta") {
          answer += String(data.text ?? "");
          setTurns([...history, { role: "assistant", content: answer }]);
        } else if (event === "error") throw new Error(String(data.code ?? "ERROR"));
        else if (event === "done" && data.stopReason === "refusal") answer ||= t("coach.refused");
      }
    } catch (err) {
      if (!abort.signal.aborted) setError(errorText((err as Error).message));
    } finally {
      // keep what arrived; drop an empty answer so the history stays valid
      setTurns(answer ? [...history, { role: "assistant", content: answer }] : history.slice(0, -1));
      if (!answer) setDraft(question);
      setBusy(false);
      abortRef.current = null;
      void refreshStatus();
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  if (!status)
    return (
      <div className="mx-auto w-full max-w-[880px]">
        <Skeleton style={{ height: 320 }} />
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
      <div className="row between wrap">
        <div>
          <h1 className="pix pix-md uppercase">{t("coach.title")}</h1>
          <p className="muted mt-1">{t("coach.subtitle")}</p>
        </div>
        {status.enabled && turns.length > 0 && !busy && (
          <Button variant="ghost" size="sm" onClick={() => setTurns([])}>
            <Trash2 className="ico" aria-hidden />
            {t("coach.newChat")}
          </Button>
        )}
      </div>

      {!status.enabled ? (
        <Panel>
          <EmptyState icon={<Bot className="ico" aria-hidden />} title={t("coach.disabled")} body={t("coach.disabledBody")} />
        </Panel>
      ) : (
        <Panel className="flex min-h-[420px] flex-col !p-0">
          <ol ref={listRef} className="stack stack-3 max-h-[60vh] flex-1 overflow-y-auto p-4" aria-live="polite" aria-busy={busy}>
            {turns.length === 0 && (
              <li className="stack stack-3 items-start">
                <p className="muted">{t("coach.intro")}</p>
                <div className="row wrap">
                  {SUGGESTIONS.map((k) => (
                    <Button key={k} size="sm" variant="secondary" onClick={() => void ask(t(k))}>
                      {t(k)}
                    </Button>
                  ))}
                </div>
              </li>
            )}
            {turns.map((m, i) => (
              <li key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <span className="sr-only">{m.role === "user" ? t("coach.you") : t("coach.title")}: </span>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-md border px-3 py-2",
                    m.role === "user" ? "border-neon-magenta bg-surface-1" : "border-border bg-surface-2"
                  )}
                >
                  {m.content || (busy && i === turns.length - 1 ? <span className="subtle">{t("coach.thinking")}</span> : null)}
                </p>
              </li>
            ))}
          </ol>
          {error && (
            <div className="px-4 pb-2">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
          <form onSubmit={submit} className="row border-t border-border p-3">
            <label htmlFor="coach-input" className="sr-only">
              {t("coach.placeholder")}
            </label>
            <textarea
              id="coach-input"
              rows={1}
              maxLength={2000}
              value={draft}
              placeholder={t("coach.placeholder")}
              className="input min-h-[40px] flex-1 resize-none py-2"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }
              }}
            />
            {busy ? (
              <Button type="button" variant="secondary" onClick={() => abortRef.current?.abort()} aria-label={t("coach.stop")}>
                <Square className="ico" aria-hidden />
                <span className="max-sm:sr-only">{t("coach.stop")}</span>
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={!draft.trim() || status.remaining === 0} aria-label={t("chat.send")}>
                <Send className="ico" aria-hidden />
                <span className="max-sm:sr-only">{t("chat.send")}</span>
              </Button>
            )}
          </form>
          <p className="t-caption subtle px-4 pb-3">{t("coach.remaining", { n: status.remaining, limit: status.limit })}</p>
        </Panel>
      )}
    </div>
  );
}
