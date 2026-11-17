"use client";

import { Dialog as DialogPrimitive, Switch as SwitchPrimitive, Tabs as TabsPrimitive, Tooltip as TooltipPrimitive, DropdownMenu as MenuPrimitive } from "radix-ui";
import { Inbox } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Presence } from "@/lib/types";

/* ---------------- Panel ---------------- */
export function Panel({
  className,
  tone = 1,
  title,
  actions,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & { tone?: 1 | 2 | 3; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cn("panel", tone === 2 && "panel-2", tone === 3 && "panel-3", className)} {...props}>
      {(title || actions) && (
        <div className="panel-head">
          {typeof title === "string" ? <h2 className="t-heading">{title}</h2> : title}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({
  tone,
  icon,
  className,
  children,
}: {
  tone?: "magenta" | "cyan" | "amber" | "green" | "red";
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("badge", tone && `badge-${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}

export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="badge badge-count" aria-label={label}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ---------------- Spinner, Skeleton, Kbd ---------------- */
export function Spinner({ large, label }: { large?: boolean; label?: string }) {
  return <span className={cn("spinner", large && "spinner-lg")} role={label ? "status" : undefined} aria-label={label} />;
}

export function Skeleton({ className, circle, style }: { className?: string; circle?: boolean; style?: React.CSSProperties }) {
  return <span className={cn("skel", circle && "skel-circle", className)} style={style} aria-hidden />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-mark">{icon ?? <Inbox className="ico" aria-hidden />}</div>
      <h3 className="t-heading">{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

/* ---------------- Avatar (+ presence shape + word available via label) ---------------- */
export function initials(name: string) {
  const parts = name.replace(/[^A-Za-z0-9 _.]/g, "").split(/[ _.]+/).filter(Boolean);
  const value = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return value.toUpperCase();
}

export function Avatar({
  name,
  src,
  size = "md",
  ring,
  presence,
  presenceLabel,
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: "you" | "opp";
  presence?: Presence;
  presenceLabel?: string;
  className?: string;
}) {
  return (
    <span className={cn("avatar", size !== "md" && `avatar-${size}`, ring, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from many hosts and our /api
        <img src={src} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      {presence && <PresenceDot presence={presence} label={presenceLabel} />}
    </span>
  );
}

export function PresenceDot({ presence, label, inline }: { presence: Presence; label?: string; inline?: boolean }) {
  return (
    <span
      className={cn("presence", `presence-${presence.toLowerCase()}`, inline && "presence-inline")}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/* ---------------- Modal (Radix Dialog) ---------------- */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  forced,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** No Esc, no backdrop close (session expired) */
  forced?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={forced ? undefined : onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="scrim" style={{ position: "fixed" }} />
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
          <DialogPrimitive.Content
            className="modal pointer-events-auto"
            onEscapeKeyDown={forced ? (e) => e.preventDefault() : undefined}
            onPointerDownOutside={forced ? (e) => e.preventDefault() : undefined}
            onInteractOutside={forced ? (e) => e.preventDefault() : undefined}
            aria-describedby={description ? undefined : undefined}
          >
            <DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
            {children}
            {actions && <div className="modal-actions">{actions}</div>}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ---------------- Switch ---------------- */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id: string;
}) {
  return (
    <div className="row between row-4 py-2">
      <div className="grow">
        <label htmlFor={id} className="t-strong">
          {label}
        </label>
        {description && <p className="t-caption subtle">{description}</p>}
      </div>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="switch-track relative cursor-pointer data-[state=checked]:border-neon-magenta data-[state=checked]:bg-neon-magenta"
        style={{ padding: 0 }}
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-[3px] rounded-full bg-fg-muted transition-transform data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-on-neon" />
      </SwitchPrimitive.Root>
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("tabs", className)} {...props} />;
}
export function Tab({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn("tab", className)} {...props} />;
}
export const TabPanel = TabsPrimitive.Content;

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
  mono,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("seg", mono && "lang", className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Tooltip ---------------- */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={8} className="tooltip z-50" style={{ position: "relative" }}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/* ---------------- Dropdown menu ---------------- */
export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export function MenuContent({ className, ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn("panel panel-3 z-50 min-w-[200px] !p-1", className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}
export function MenuItem({ className, danger, ...props }: ComponentProps<typeof MenuPrimitive.Item> & { danger?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "list-row cursor-pointer outline-none data-[highlighted]:bg-surface-2 text-[14px]",
        danger && "c-red",
        className
      )}
      {...props}
    />
  );
}
export const MenuSeparator = () => <MenuPrimitive.Separator className="divider !my-1" />;
