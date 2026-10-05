"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { capability, useReducedMotion } from "@/lib/prefs";
import { spring, tween } from "@/design/motion";

type Mode = "default" | "link" | "text" | "drag" | "hidden";

/**
 * A reticle cursor that reacts to content:
 *  - [data-cursor="link"] grows and shows `data-cursor-label`
 *  - inputs/textareas fall back to the native caret
 * Mouse + full motion only; otherwise the native cursor is untouched.
 */
export function GlowCursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, spring.cursor);
  const sy = useSpring(y, spring.cursor);

  useEffect(() => {
    const ok = !reduced && capability().finePointer;
    setEnabled(ok);
    document.documentElement.classList.toggle("has-custom-cursor", ok);
    if (!ok) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      const el = t?.closest<HTMLElement>("[data-cursor], a, button, input, textarea, [role=button], summary");
      if (!el) {
        setMode("default");
        setLabel(null);
      } else if (el.matches("input, textarea")) {
        setMode("text");
        setLabel(null);
      } else {
        setMode((el.dataset.cursor as Mode) || "link");
        setLabel(el.dataset.cursorLabel ?? null);
      }
    };
    const leave = () => setMode("hidden");
    const enter = () => setMode("default");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    document.documentElement.addEventListener("pointerenter", enter);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.removeEventListener("pointerenter", enter);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [reduced, x, y]);

  if (!enabled) return null;
  const size = mode === "link" ? (label ? 84 : 44) : mode === "text" ? 4 : mode === "hidden" ? 0 : 22;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: "var(--z-cursor)" }}>
      <motion.div className="absolute left-0 top-0" style={{ x: sx, y: sy }}>
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-signal flex items-center justify-center"
          animate={{
            width: size,
            height: size,
            backgroundColor: mode === "link" ? "color-mix(in oklab, var(--c-signal) 14%, transparent)" : "transparent",
            boxShadow: mode === "link" ? "0 0 32px var(--c-glow)" : "0 0 0 transparent",
          }}
          transition={spring.snappy}
        >
          <AnimatePresence>
            {label ? (
              <motion.span
                key={label}
                className="mono text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-signal-ink"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={tween("fast")}
              >
                {label}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      {/* crisp centre dot tracks without lag */}
      <motion.div className="absolute left-0 top-0 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" style={{ x, y }} />
    </div>
  );
}
