"use client";

import { useScroll, useSpring, useMotionValue, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { spring } from "@/design/motion";
import { cn } from "@/lib/cn";

type Props = {
  /** extra scroll distance while pinned, in viewport heights */
  length?: number;
  pin?: boolean;
  /** progress used when motion is reduced (scene shown in its resolved state, not pinned) */
  reducedProgress?: number;
  /** smooth the scrubbed value with spring.gentle */
  smooth?: boolean;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  children: (progress: MotionValue<number>) => ReactNode;
};

/**
 * A pinned, scroll-scrubbed scene built on `position: sticky` + scroll progress.
 * No DOM re-parenting (unlike pin-spacer approaches), works with native, Lenis and touch
 * scrolling, and exposes 0→1 progress as a MotionValue so DOM, SVG or WebGL children can bind
 * to it without React re-renders. Under reduced motion it is a normal, unpinned section.
 */
export function ScrollScene({ length = 1, pin = true, reducedProgress = 1, smooth = false, className, children, id, ...aria }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smoothed = useSpring(scrollYProgress, spring.gentle);
  const fixed = useMotionValue(reducedProgress);
  const progress = reduced ? fixed : smooth ? smoothed : scrollYProgress;
  const pinned = pin && !reduced;

  return (
    <section
      ref={ref}
      id={id}
      className={cn("relative", className)}
      style={pinned ? { height: `${(1 + length) * 100}svh` } : undefined}
      data-scene-pinned={pinned ? "true" : "false"}
      {...aria}
    >
      <div className={pinned ? "sticky top-0" : undefined}>{children(progress)}</div>
    </section>
  );
}
