"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useRef, type ReactNode, type PointerEvent } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { distance, spring } from "@/design/motion";
import { cn } from "@/lib/cn";

type Props = { children: ReactNode; className?: string; max?: number; glare?: boolean };

/** 3D tilt toward the pointer with a moving glare. Mouse only; flat on touch/reduced. */
export function TiltCard({ children, className, max = distance.tilt, glare = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useSpring(useMotionValue(0), spring.gentle);
  const ry = useSpring(useMotionValue(0), spring.gentle);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareOpacity = useSpring(useMotionValue(0), spring.gentle);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, color-mix(in oklab, var(--c-signal) 16%, transparent), transparent 60%)`;

  const onMove = (e: PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    glareOpacity.set(1);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const reset = () => {
    glareOpacity.set(0);
    rx.set(0);
    ry.set(0);
  };

  return (
    <div style={{ perspective: 900 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={reduced ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className={cn("relative h-full", className)}
      >
        {children}
        {glare && !reduced ? (
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: bg, opacity: glareOpacity }} />
        ) : null}
      </motion.div>
    </div>
  );
}
