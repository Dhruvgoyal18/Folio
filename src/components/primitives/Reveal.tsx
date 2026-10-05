"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { distance, reduced as reducedT, tween, type DurationToken, type EaseToken } from "@/design/motion";

type Props = {
  children: ReactNode;
  /** seconds */
  delay?: number;
  /** px travelled during entrance; defaults to the entrance token */
  y?: number;
  x?: number;
  duration?: DurationToken;
  ease?: EaseToken;
  /** fraction of element visible before it reveals */
  amount?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "article" | "span" | "p" | "header";
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "whileInView">;

/** Entrance: rise + fade when scrolled into view. Reduced motion → short crossfade. */
export function Reveal({
  children, delay = 0, y = distance.entrance, x = 0, duration = "slow", ease = "out",
  amount = 0.2, once = true, as = "div", className, ...rest
}: Props) {
  const reduced = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, amount }}
      transition={reduced ? { duration: reducedT.duration / 1000, delay: 0 } : tween(duration, ease, delay)}
      {...rest}
    >
      {children}
    </Comp>
  );
}
