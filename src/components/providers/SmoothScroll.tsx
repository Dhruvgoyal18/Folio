"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/prefs";
import { scroll, sec } from "@/design/motion";

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

/** Scroll to an element id, through Lenis when active. */
export function scrollToId(id: string, lenis: Lenis | null, offset = -80) {
  const el = document.getElementById(id) ?? document.querySelector<HTMLElement>(`[data-cite-id="${id}"]`);
  if (!el) return null;
  if (lenis) lenis.scrollTo(el, { offset, duration: sec("cinematic") });
  else el.scrollIntoView({ behavior: "auto", block: "start" });
  return el;
}

/**
 * Lenis smooth wheel scrolling (touch stays native). Lenis drives the real document scroll,
 * so sticky scenes and motion's useScroll stay in sync with no extra wiring.
 * Disabled entirely under reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reduced) {
      setLenis(null);
      return;
    }
    const l = new Lenis({ lerp: scroll.lerp, smoothWheel: true, syncTouch: false, autoRaf: true });
    setLenis(l);
    (window as unknown as { __lenis?: Lenis }).__lenis = l;
    return () => {
      l.destroy();
      (window as unknown as { __lenis?: Lenis }).__lenis = undefined;
      setLenis(null);
    };
  }, [reduced]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
