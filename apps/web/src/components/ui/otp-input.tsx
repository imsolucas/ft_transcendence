"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/** Six cells, auto-advance, paste fills all six, backspace moves back. */
export function OtpInput({
  value,
  onChange,
  invalid,
  label,
  digitLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  label: string;
  digitLabel: (n: number) => string;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function setAt(i: number, d: string) {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, 6));
  }

  return (
    <div className={cn("otp", invalid && "is-error")} role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={digitLabel(i + 1)}
          aria-invalid={invalid || undefined}
          value={d}
          className="h-14 w-12 rounded-md border border-border-strong bg-bg text-center font-mono text-2xl font-medium outline-none focus:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg aria-[invalid=true]:border-neon-red"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) {
              // paste or autofill of the whole code
              onChange(v.slice(0, 6));
              refs.current[Math.min(5, v.length)]?.focus();
              return;
            }
            setAt(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (v) {
              e.preventDefault();
              onChange(v);
              refs.current[Math.min(5, v.length)]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
