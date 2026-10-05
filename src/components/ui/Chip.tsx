import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Chip({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "signal" | "teal" | "solid"; className?: string }) {
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-mono)]",
        tone === "default" && "border-rule text-ink-muted",
        tone === "signal" && "border-signal text-signal-ink",
        tone === "teal" && "border-teal text-teal",
        tone === "solid" && "border-ink bg-ink text-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}
