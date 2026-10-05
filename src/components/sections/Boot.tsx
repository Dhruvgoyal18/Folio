"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useSite } from "@/site/SiteContext";
import { prefs } from "@/lib/prefs";
import { duration, tween } from "@/design/motion";


/**
 * Scene 00 — the title block stamps in and counts down, then the sheet feeds away.
 * Once per session, ≤ 1.2s, skippable (click / any key), never under reduced motion.
 */
export function Boot() {
  const site = useSite();
  const KEY = `dg01.booted.${site.slug}`;
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(3);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {
      seen = true;
    }
    const skip = seen || prefs.get().motion === "reduced" || new URLSearchParams(location.search).has("noboot");
    if (skip) return;
    setShow(true);
    const step = duration.cinematic / 4;
    const timers = [1, 2].map((k) => setTimeout(() => setCount(3 - k), step * k));
    const done = setTimeout(() => setShow(false), duration.cinematic);
    const end = () => setShow(false);
    window.addEventListener("keydown", end, { once: true });
    window.addEventListener("pointerdown", end, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
      window.removeEventListener("keydown", end);
      window.removeEventListener("pointerdown", end);
    };
  }, [KEY]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          aria-hidden="true"
          data-testid="boot"
          className="fixed inset-0 flex items-center justify-center bg-ink text-paper"
          style={{ zIndex: "var(--z-boot)" }}
          initial={{ clipPath: "inset(0 0 0 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={tween("slower", "inOut")}
        >
          <motion.div
            className="mono grid w-[min(92vw,560px)] grid-cols-[1fr_auto] border border-paper/30 text-[length:var(--fs--1)]"
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={tween("base")}
          >
            <div className="border-b border-r border-paper/30 p-3 uppercase tracking-[var(--tr-caps)]">{site.genome.copy.kicker}</div>
            <div className="border-b border-paper/30 p-3">{site.resume.profile.callsign}</div>
            <div className="border-r border-paper/30 p-3 uppercase tracking-[var(--tr-caps)] opacity-70">{site.resume.profile.name}</div>
            <div className="p-3 text-signal">T−{count}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
