"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/prefs";
import { tween, reducedTransition } from "@/design/motion";

// The very first render is server HTML: never hide it (protects LCP and no-JS).
let hasMounted = false;

/**
 * Route entrance: an ink sheet wipes off upward (a plotter feeding a new page)
 * while content settles in. Runs on client navigations only — not on first load.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  // Decided once per mount, so a later re-render never changes the tree shape (which would remount the page).
  const [animateIn] = useState(() => hasMounted);
  useEffect(() => {
    hasMounted = true;
  }, []);

  if (!animateIn) return <>{children}</>;

  return (
    <>
      {!reduced ? (
        <motion.div
          aria-hidden
          data-testid="page-wipe"
          className="pointer-events-none fixed inset-0 bg-ink"
          style={{ zIndex: "var(--z-overlay)" }}
          initial={{ clipPath: "inset(0 0 0 0)" }}
          animate={{ clipPath: "inset(0 0 100% 0)" }}
          transition={tween("slower", "inOut")}
        />
      ) : null}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
        transition={reduced ? reducedTransition : tween("slower", "out", 0.15)}
      >
        {children}
      </motion.div>
    </>
  );
}
