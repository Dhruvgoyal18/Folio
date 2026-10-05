"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { distance } from "@/design/motion";

type Props = { children: ReactNode; speed?: number; className?: string };

/** Layer drifts against scroll. speed 1 = one parallax token of travel; negative = opposite. */
export function Parallax({ children, speed = 0.5, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const travel = distance.parallax * speed;
  const y = useTransform(scrollYProgress, [0, 1], [travel, -travel]);
  return (
    <motion.div ref={ref} className={className} style={reduced ? undefined : { y }}>
      {children}
    </motion.div>
  );
}
