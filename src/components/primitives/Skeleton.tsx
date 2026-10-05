import { cn } from "@/lib/cn";

/** Loading placeholder. The shimmer respects reduced motion via the global animation rule. */
export function Skeleton({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("relative overflow-hidden rounded-md bg-paper-sunk", className)}>
      <div
        aria-hidden
        className="absolute inset-0 -translate-x-full animate-[shimmer_var(--loop-shimmer)_var(--ease-inOut)_infinite]"
        style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--c-ink) 6%, transparent), transparent)" }}
      />
      <style>{`@keyframes shimmer{to{transform:translateX(100%)}}`}</style>
    </div>
  );
}
