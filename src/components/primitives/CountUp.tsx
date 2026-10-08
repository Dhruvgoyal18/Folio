"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { duration as durations, type DurationToken } from "@/design/motion";
import { easeFn } from "@/design/easing";
import { cn } from "@/lib/cn";

type Props = {
  value: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: DurationToken;
  delay?: number;
  className?: string;
  onDone?: () => void;
};

/** Number that counts up when visible. Assistive tech reads the final value only. */
export function CountUp({ value, from = 0, prefix = "", suffix = "", decimals = 0, duration = "cinematic", delay = 0, className, onDone }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? value : from);
  const fmt = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setN(value);
      onDone?.();
      return;
    }
    // tiny rAF tween (no animation engine needed) using the ease.out token
    const curve = easeFn("out");
    const total = durations[duration];
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now + delay * 1000;
      const k = Math.min(1, Math.max(0, (now - start) / total));
      setN(from + (value - from) * curve(k));
      if (k < 1) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, value, from]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <span className="sr-only">{fmt(value)}</span>
      <span aria-hidden="true" className="tabular-nums">{fmt(n)}</span>
    </span>
  );
}
