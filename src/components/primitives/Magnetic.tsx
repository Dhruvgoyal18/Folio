"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef, type ReactNode, type PointerEvent } from "react";
import { capability, useReducedMotion } from "@/lib/prefs";
import { distance, spring } from "@/design/motion";

type Props = { children: ReactNode; strength?: number; className?: string };

/** Pulls its child toward the pointer. Inert on touch and under reduced motion. */
export function Magnetic({ children, strength = distance.magnetic, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), spring.magnetic);
  const y = useSpring(useMotionValue(0), spring.magnetic);

  const onMove = (e: PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || !capability().finePointer || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} className={className ?? "inline-block"} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  );
}
