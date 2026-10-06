import { cn } from "@/lib/cn";

/**
 * Soft gradient light (the "aurora" hero): three blurred blobs in the accent, its complement and
 * a mix of both. Pure CSS — no canvas, no JS — so it costs nothing at load. Drift animation lives in
 * globals.css and only runs with full motion; the seed sets where the light sits.
 */
export function Aurora({ seed, className }: { seed: number; className?: string }) {
  const r = (n: number) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2) * 100;
  const blobs = [
    { x: 15 + r(1) * 0.3, y: 10 + r(2) * 0.3, s: 62, c: "var(--c-signal)", a: 0.42 },
    { x: 55 + r(3) * 0.3, y: 5 + r(4) * 0.25, s: 55, c: "var(--c-teal)", a: 0.34 },
    { x: 35 + r(5) * 0.3, y: 45 + r(6) * 0.2, s: 70, c: "color-mix(in oklab, var(--c-signal) 50%, var(--c-teal))", a: 0.3 },
  ];
  return (
    <div aria-hidden className={cn("aurora pointer-events-none overflow-hidden", className)}>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="aurora-blob absolute rounded-full"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.s}vmax`,
            height: `${b.s}vmax`,
            translate: "-50% -50%",
            background: `radial-gradient(closest-side, color-mix(in oklab, ${b.c} ${Math.round(b.a * 100)}%, transparent), transparent)`,
            ["--i" as string]: i,
          }}
        />
      ))}
      <span className="aurora-fade absolute inset-0" />
    </div>
  );
}
