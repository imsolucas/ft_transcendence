"use client";

import { AlertCircle } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** FormField: label + control + hint + error, wired with aria-describedby / aria-invalid. */
export function FormField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("field", className)}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          <AlertCircle className="ico" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Input with the design's well, optional leading icon and trailing slot. */
export function Input({
  className,
  invalid,
  icon,
  trailing,
  mono,
  ...props
}: ComponentProps<"input"> & { invalid?: boolean; icon?: ReactNode; trailing?: ReactNode; mono?: boolean }) {
  return (
    <div className={cn("input", invalid && "is-error", mono && "is-mono", props.disabled && "is-disabled", className)}>
      {icon}
      <input aria-invalid={invalid || undefined} {...props} />
      {trailing}
    </div>
  );
}

export function NativeSelect({ className, invalid, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <div className={cn("input", invalid && "is-error", className)}>
      <select aria-invalid={invalid || undefined} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Callout({
  tone = "info",
  icon,
  children,
  className,
}: {
  tone?: "info" | "error" | "warn";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("callout", tone === "error" && "callout-error", tone === "warn" && "callout-warn", className)}
    >
      {icon}
      <div className="grow">{children}</div>
    </div>
  );
}
