"use client";

import * as Switch from "@radix-ui/react-switch";
import { motion } from "motion/react";
import { spring } from "@/design/motion";
import { useReducedMotion } from "@/lib/prefs";
import { play } from "@/lib/sound";
import { cn } from "@/lib/cn";

/** Animated switch (Radix for semantics/keyboard, spring for the thumb). */
export function Toggle({
  checked, onCheckedChange, label, className, id,
}: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; className?: string; id?: string }) {
  const reduced = useReducedMotion();
  return (
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={(v) => {
        play("toggle");
        onCheckedChange(v);
      }}
      aria-label={label}
      data-cursor="link"
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill border border-ink/70 p-0.5 transition-colors duration-[var(--dur-base)]",
        checked ? "bg-signal-ink border-signal-ink" : "bg-paper-sunk",
        className,
      )}
    >
      <Switch.Thumb asChild>
        <motion.span
          layout={!reduced}
          transition={spring.snappy}
          className={cn("block h-5 w-5 rounded-full shadow-paper", checked ? "ml-auto bg-paper" : "bg-ink")}
        />
      </Switch.Thumb>
    </Switch.Root>
  );
}
