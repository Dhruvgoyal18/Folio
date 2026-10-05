"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { distance, spring } from "@/design/motion";
import { useReducedMotion } from "@/lib/prefs";
import { play } from "@/lib/sound";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "signal";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-signal-ink hover:text-on-signal",
  signal: "bg-signal-ink text-on-signal hover:bg-ink hover:text-paper",
  outline: "border border-ink/80 text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-ink/5",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[length:var(--fs--1)] gap-1.5",
  md: "h-11 px-5 text-[length:var(--fs-0)] gap-2",
  lg: "h-12 px-6 text-[length:var(--fs-0)] gap-2.5 max-sm:h-11 max-sm:px-5",
};

type Common = { variant?: Variant; size?: Size; children: ReactNode; className?: string; cursorLabel?: string };
type AsButton = Common & Omit<HTMLMotionProps<"button">, "children"> & { href?: undefined };
type AsLink = Common & Omit<HTMLMotionProps<"a">, "children"> & { href: string };

const cls = (v: Variant, s: Size, c?: string) =>
  cn(
    "relative inline-flex select-none items-center justify-center rounded-pill font-medium",
    "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]",
    "disabled:opacity-50 disabled:pointer-events-none",
    variants[v], sizes[s], c,
  );

/** Primary action with spring press feedback and an optional cursor label. */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, AsButton | AsLink>(function Button(
  { variant = "primary", size = "md", className, children, cursorLabel, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const feedback = reduced ? {} : { whileTap: { scale: distance.pressScale }, transition: spring.snappy };
  if ("href" in rest && rest.href) {
    const { onClick, ...a } = rest as AsLink;
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={cls(variant, size, className)}
        data-cursor="link"
        data-cursor-label={cursorLabel}
        onClick={(e) => {
          play("press");
          onClick?.(e);
        }}
        {...feedback}
        {...a}
      >
        {children}
      </motion.a>
    );
  }
  const { onClick, type = "button", ...b } = rest as AsButton;
  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={cls(variant, size, className)}
      data-cursor="link"
      data-cursor-label={cursorLabel}
      onClick={(e) => {
        play("press");
        onClick?.(e);
      }}
      {...feedback}
      {...b}
    >
      {children}
    </motion.button>
  );
});

/** Square icon button with an accessible name (required). */
export function IconButton({
  label, children, className, pressed, ...rest
}: { label: string; children: ReactNode; className?: string; pressed?: boolean } & Omit<HTMLMotionProps<"button">, "children">) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      data-cursor="link"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-pill border border-rule text-ink",
        "transition-colors duration-[var(--dur-fast)] hover:border-ink hover:bg-ink hover:text-paper",
        className,
      )}
      {...(reduced ? {} : { whileTap: { scale: distance.pressScale }, transition: spring.snappy })}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
