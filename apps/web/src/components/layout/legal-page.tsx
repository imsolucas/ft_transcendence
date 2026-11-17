"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { LegalDoc } from "@/content/legal/types";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form";
import { Footer, Wordmark } from "./shell";

/** Long-form legal layout: 240px sticky contents beside a 680px text column; Select on mobile. */
export function LegalPage({ title, doc }: { title: string; doc: LegalDoc }) {
  const { t, href, locale } = useI18n();
  const [current, setCurrent] = useState(doc.sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    doc.sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [doc]);

  const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(doc.updated));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface-2">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-8">
          <Wordmark href={href("/")} />
          <Button asChild size="sm">
            <Link href={href("/lobby")} className="no-underline">
              <Gamepad2 className="ico" aria-hidden />
              {t("common.play")}
            </Link>
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[1120px] flex-1 gap-10 px-4 py-10 md:px-8">
        <nav aria-label={t("legal.contents")} className="sticky top-24 hidden h-fit w-[240px] shrink-0 md:block">
          <p className="t-label subtle mb-3">{t("legal.contents")}</p>
          <ul className="stack">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={current === s.id ? "location" : undefined}
                  className={
                    "block border-l-2 pl-3 no-underline " +
                    (current === s.id ? "border-neon-cyan text-fg" : "border-transparent text-fg-muted hover:text-fg")
                  }
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-[680px] flex-1">
          <h1 className="pix pix-md mb-2">{title}</h1>
          <p className="t-caption subtle mb-6">{t("legal.lastUpdated", { date: updated })}</p>
          <div className="mb-6 md:hidden">
            <NativeSelect
              aria-label={t("legal.contents")}
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value);
                document.getElementById(e.target.value)?.scrollIntoView();
              }}
            >
              {doc.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </NativeSelect>
          </div>
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="mb-8 scroll-mt-24">
              <h2 className="t-heading mb-3 text-fg">{s.title}</h2>
              {s.body?.map((p, i) => (
                <p key={i} className="mb-3 text-[16px] leading-[26px] text-fg-muted">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="mb-3 list-disc space-y-2 pl-5 text-[16px] leading-[26px] text-fg-muted" style={{ listStyle: "disc" }}>
                  {s.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
