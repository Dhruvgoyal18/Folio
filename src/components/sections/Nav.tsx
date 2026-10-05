"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { MotionToggle, SoundToggle, ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { IconButton } from "@/components/ui/Button";
import { Terminal } from "@/components/ui/icons";
import { useLenis, scrollToId } from "@/components/providers/SmoothScroll";
import { emit } from "@/lib/events";
import { useReducedMotion } from "@/lib/prefs";
import { spring } from "@/design/motion";
import { cn } from "@/lib/cn";
import { useSite } from "@/site/SiteContext";



export function Nav() {
  const site = useSite();
  const CHAPTERS = site.chapters;
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string>("launch");
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, spring.gentle);

  // Active chapter from scroll position. Chapters mount progressively (code-split, rendered in a
  // transition), so this reads the DOM on every frame of scrolling instead of observing a fixed set.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      setScrolled(window.scrollY > 24);
      const line = window.innerHeight * 0.45;
      let current = CHAPTERS[0]?.id ?? "launch";
      for (const c of CHAPTERS) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= line) current = c.id;
      }
      // at the very bottom, the last chapter is current even if it's short
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = CHAPTERS[CHAPTERS.length - 1]?.id ?? current;
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const late = window.setTimeout(measure, 1200); // after the chapters have mounted
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(late);
    };
  }, [CHAPTERS]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 transition-[background-color,border-color] duration-[var(--dur-base)]",
        scrolled ? "vellum border-b border-rule" : "border-b border-transparent",
      )}
      style={{ zIndex: "var(--z-nav)" }}
    >
      <motion.div aria-hidden className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-signal" style={{ scaleX: bar }} />
      <nav aria-label="Chapters" className="flex h-16 items-center gap-4 px-gutter">
        <a
          href="#launch"
          onClick={(e) => {
            e.preventDefault();
            if (lenis) lenis.scrollTo(0);
            else window.scrollTo({ top: 0 });
          }}
          className="mono flex shrink-0 items-center gap-2 whitespace-nowrap text-[length:var(--fs--1)] font-medium no-underline"
          data-cursor-label="Top"
        >
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-signal" />
          {site.resume.profile.callsign}
          <span className="sr-only">— back to top</span>
        </a>
        <ol className="no-scrollbar mx-auto hidden min-w-0 items-center gap-0.5 overflow-x-auto lg:flex">
          {CHAPTERS.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={active === c.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(c.id, lenis, 0);
                  history.replaceState(null, "", `#${c.id}`);
                }}
                className={cn(
                  "mono relative block whitespace-nowrap rounded-pill px-2.5 py-1.5 text-[length:var(--fs--2)] uppercase tracking-[0.08em] no-underline transition-colors duration-[var(--dur-fast)]",
                  active === c.id ? "text-paper" : "text-ink-muted hover:text-ink",
                )}
              >
                {active === c.id ? (
                  <motion.span layoutId={reduced ? undefined : "nav-pill"} className="absolute inset-0 rounded-pill bg-ink" transition={spring.snappy} />
                ) : null}
                {/* positioned after the pill, so it paints above it without negative z-index */}
                <span className="relative">
                  <span aria-hidden className="max-xl:hidden">{c.code} </span>
                  {c.label}
                </span>
              </a>
            </li>
          ))}
        </ol>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <IconButton label="Open terminal (press ~)" onClick={() => emit("dg:terminal")} className="max-sm:hidden" data-testid="terminal-button">
            <Terminal />
          </IconButton>
          <SoundToggle />
          <MotionToggle />
          <ThemeSwitch />
        </div>
      </nav>
    </header>
  );
}
