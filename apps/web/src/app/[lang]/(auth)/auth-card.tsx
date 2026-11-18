"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Footer, Wordmark } from "@/components/layout/shell";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { href } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1440px] items-center px-4 py-4 md:px-8">
        <Wordmark href={href("/")} />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-8 md:items-center">
        <div className="panel w-full max-w-[440px]">
          <h1 className="t-title mb-1">{title}</h1>
          {subtitle && <p className="muted mb-5">{subtitle}</p>}
          {children}
          {footer && <div className="mt-5 border-t border-border pt-4 text-center">{footer}</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}


export function OrRule({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="t-caption subtle uppercase">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
