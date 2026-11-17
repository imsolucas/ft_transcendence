import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Design System Button: one primary per screen; glow is opt-in for the one glowing element. */
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      secondary: "",
      primary: "btn-primary",
      ghost: "btn-ghost",
      danger: "btn-danger",
    },
    size: {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
      xl: "btn-xl",
    },
    glow: { none: "", sm: "glow-sm", md: "glow" },
    block: { true: "btn-block", false: "" },
  },
  defaultVariants: { variant: "secondary", size: "md", glow: "none", block: false },
});

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({ className, variant, size, glow, block, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, glow, block }), loading && "is-loading", className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <span className="spinner" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}

export function IconButton({
  className,
  label,
  bordered,
  size = "md",
  ...props
}: ComponentProps<"button"> & { label: string; bordered?: boolean; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("icon-btn", bordered && "bordered", size === "sm" && "icon-btn-sm", className)}
      {...props}
    />
  );
}
