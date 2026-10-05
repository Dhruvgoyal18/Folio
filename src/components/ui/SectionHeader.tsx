import { SplitText } from "@/components/primitives/SplitText";
import { Reveal } from "@/components/primitives/Reveal";
import { cn } from "@/lib/cn";

/** Chapter header: mono code + eyebrow, kinetic display title, optional lede. */
export function SectionHeader({
  code, eyebrow, title, lede, id, className,
}: { code: string; eyebrow: string; title: string; lede?: string; id: string; className?: string }) {
  return (
    <header className={cn("mb-[var(--sp-7)] grid gap-[var(--sp-3)] md:grid-cols-12", className)}>
      <div className="md:col-span-3 flex items-start gap-3 pt-2">
        <span className="mono text-[length:var(--fs--1)] text-signal-ink">{code}</span>
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <div className="md:col-span-9">
        <SplitText as="h2" id={id} text={title} by="word" className="display max-w-[22ch] text-[length:var(--fs-5)] leading-[1.02]" />
        {lede ? (
          <Reveal delay={0.15}>
            <p className="mt-[var(--sp-4)] max-w-[60ch] text-[length:var(--fs-1)] leading-relaxed text-ink-muted">{lede}</p>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}
