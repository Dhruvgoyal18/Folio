"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  /** seconds per loop */
  speed?: number;
  reverse?: boolean;
  className?: string;
  label?: string;
};

/** Infinite ribbon. Duplicate track is aria-hidden; pauses on hover/focus; static when reduced. */
export function Marquee({ children, speed = 40, reverse = false, className, label }: Props) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("group relative flex overflow-hidden", className)} role={label ? "region" : undefined} aria-label={label}>
      {[0, 1].map((k) => (
        <div
          key={k}
          aria-hidden={k === 1 ? true : undefined}
          className={cn(
            "flex shrink-0 items-center gap-[var(--sp-6)] pr-[var(--sp-6)]",
            !reduced && "animate-[marquee_var(--marquee-speed)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
            reduced && k === 1 && "hidden",
          )}
          style={{ ["--marquee-speed" as string]: `${speed}s`, animationDirection: reverse ? "reverse" : "normal" }}
        >
          {children}
        </div>
      ))}
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-100%)}}`}</style>
    </div>
  );
}
