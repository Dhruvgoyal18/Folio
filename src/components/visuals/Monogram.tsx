import { cn } from "@/lib/cn";

/**
 * A typographic hero visual: the owner's initials, very large, drawn as an outline with a
 * dimension ring. Works for any name and any palette; the seed only tilts the ring.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : (parts[0]?.[1] ?? "");
  return (first + last).toUpperCase();
}

export function Monogram({ name, seed, className, filled = false }: { name: string; seed: number; className?: string; filled?: boolean }) {
  const text = initials(name);
  const tilt = (seed % 40) - 20;
  return (
    <svg viewBox="0 0 400 400" className={cn("monogram", className)} aria-hidden>
      <g transform={`rotate(${tilt} 200 200)`} fill="none" stroke="var(--c-rule)" strokeWidth="1">
        <circle cx="200" cy="200" r="186" />
        <circle cx="200" cy="200" r="150" strokeDasharray="2 6" />
        <line x1="0" y1="200" x2="400" y2="200" strokeDasharray="1 5" />
        <line x1="200" y1="0" x2="200" y2="400" strokeDasharray="1 5" />
        <circle cx="386" cy="200" r="4" fill="var(--c-signal)" stroke="none" />
      </g>
      <text
        x="200"
        y="205"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--ff-display)"
        fontWeight="var(--display-weight)"
        fontSize={text.length > 1 ? 190 : 240}
        letterSpacing="-8"
        fill={filled ? "var(--c-signal)" : "none"}
        stroke={filled ? "none" : "var(--c-ink)"}
        strokeWidth={filled ? 0 : 1.5}
        className="monogram-text"
      >
        {text}
      </text>
    </svg>
  );
}
