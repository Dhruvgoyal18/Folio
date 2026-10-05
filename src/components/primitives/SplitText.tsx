"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { stagger as staggerT, tween, reducedTransition, type DurationToken } from "@/design/motion";
import { cn } from "@/lib/cn";

type Props = {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
  by?: "char" | "word";
  delay?: number;
  duration?: DurationToken;
  /** "mount" animates immediately; "inView" waits for scroll */
  trigger?: "mount" | "inView";
  className?: string;
  /** classes applied to each animated unit */
  unitClassName?: string;
  id?: string;
};

/**
 * Kinetic type. Each unit rises out of a clipped line.
 * Screen readers get the intact string via an sr-only copy; animated spans are aria-hidden.
 */
export function SplitText({
  text, as: Tag = "span", by = "char", delay = 0, duration = "slower", trigger = "inView",
  className, unitClassName, id,
}: Props) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);
  const step = by === "char" ? staggerT.char : staggerT.word;
  let i = 0;

  if (trigger === "mount") {
    // CSS-driven so it starts on first paint, before hydration (protects LCP).
    return (
      <Tag className={cn("relative", className)} id={id}>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {words.map((w, wi) => (
            <span key={wi} className="relative inline-block whitespace-nowrap overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
              {(by === "char" ? [...w] : [w]).map((u, ui) => {
                const idx = i++;
                return (
                  <span
                    key={ui}
                    className={cn("inline-block animate-[split-settle_var(--dur-slower)_var(--ease-out)_both]", unitClassName)}
                    style={{ animationDelay: `${Math.round((delay + idx * step) * 1000)}ms` }}
                  >
                    {u}
                  </span>
                );
              })}
              {/* signal bar wipes off the word; the glyphs underneath are painted from frame one (LCP-safe) */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 origin-right bg-signal animate-[split-wipe_var(--dur-slower)_var(--ease-inOut)_both]"
                style={{ animationDelay: `${Math.round((delay + wi * staggerT.word * 2) * 1000)}ms` }}
              />
              {wi < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
            </span>
          ))}
        </span>
      </Tag>
    );
  }
  const anim = { whileInView: "show", viewport: { once: true, amount: 0.5 } };

  return (
    <Tag className={cn("relative", className)} id={id}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden="true" initial="hidden" {...anim} className="inline">
        {words.map((w, wi) => (
          <span key={wi} className="inline-block whitespace-nowrap overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
            {(by === "char" ? [...w] : [w]).map((u, ui) => {
              const idx = i++;
              return (
                <motion.span
                  key={ui}
                  className={cn("inline-block will-change-transform", unitClassName)}
                  variants={
                    reduced
                      ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: reducedTransition } }
                      : {
                          hidden: { y: "110%", rotate: 4 },
                          show: { y: "0%", rotate: 0, transition: tween(duration, "out", delay + idx * step) },
                        }
                  }
                >
                  {u}
                </motion.span>
              );
            })}
            {wi < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
