"use client";

import dynamic from "next/dynamic";
import { startTransition, Suspense, useEffect, useState, type ReactNode } from "react";
import { SiteProvider, useSite } from "./SiteContext";
import type { SiteData } from "./model";
import { genomeAttrs, genomeCss } from "@/genome/apply";
import { prefs, setThemeScope, siteThemeKey } from "@/lib/prefs";
import { emit } from "@/lib/events";
import { Reticle } from "@/components/ui/icons";
import { Boot } from "@/components/sections/Boot";
import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
// Chapters are split from the hero's bundle: the first frame only pays for Nav + Hero.
const Telemetry = dynamic(() => import("@/components/sections/Telemetry").then((m) => m.Telemetry));
const Trajectory = dynamic(() => import("@/components/sections/Trajectory").then((m) => m.Trajectory));
const Payload = dynamic(() => import("@/components/sections/Payload").then((m) => m.Payload));
const Missions = dynamic(() => import("@/components/sections/Missions").then((m) => m.Missions));
const Training = dynamic(() => import("@/components/sections/Training").then((m) => m.Training));
const Comms = dynamic(() => import("@/components/sections/Comms").then((m) => m.Comms));
import type { SectionId } from "@/genome/schema";

const Capcom = dynamic(() => import("@/components/chat/Capcom"), { ssr: false });
const EasterEggs = dynamic(() => import("@/components/easter/EasterEggs"), { ssr: false });

const SECTIONS: Record<SectionId, () => ReactNode> = {
  telemetry: () => <Telemetry />,
  trajectory: () => <Trajectory />,
  payload: () => <Payload />,
  missions: () => <Missions />,
  training: () => <Training />,
  comms: () => <Comms />,
};

/** Zero-dependency stand-in for the chat orb: clicking queues the request and wakes the chat island. */
function StaticOrb() {
  const site = useSite();
  const assistant = site.genome.copy.assistant;
  return (
    <button
      type="button"
      onClick={() => emit("dg:capcom", {})}
      aria-label={`Ask ${assistant} — chat about ${site.first}'s resume`}
      data-testid="capcom-orb"
      className="fixed bottom-5 right-5 flex h-14 items-center gap-3 rounded-pill bg-ink pl-3.5 pr-5 text-paper shadow-lifted max-sm:h-12 max-sm:w-12 max-sm:justify-center max-sm:p-0 sm:bottom-6 sm:right-6"
      style={{ zIndex: "var(--z-orb)" }}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-signal text-on-signal">
        <Reticle size={18} />
      </span>
      <span className="mono text-[length:var(--fs--1)] font-medium max-sm:hidden">Ask {assistant}</span>
    </button>
  );
}

/** Chat + terminal load when the main thread is idle, or the moment the visitor reaches for them. */
function Islands() {
  const [chat, setChat] = useState(false);
  const [eggs, setEggs] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const idle = (cb: () => void, timeout: number) => (typeof w.requestIdleCallback === "function" ? w.requestIdleCallback(cb, { timeout }) : window.setTimeout(cb, timeout));
    const t1 = window.setTimeout(() => idle(() => setChat(true), 2000), 2500);
    const t2 = window.setTimeout(() => idle(() => setEggs(true), 2000), 3500);
    const wake = (e: Event) => ((e as CustomEvent<string>).detail === "dg:capcom" ? setChat(true) : setEggs(true));
    const key = (e: KeyboardEvent) => {
      if (e.key === "`" || e.key === "~") {
        const t = e.target as HTMLElement;
        if (!t.matches("input, textarea") && document.documentElement.dataset.eggs !== "ready") emit("dg:terminal");
      }
      setEggs(true);
    };
    window.addEventListener("dg:wake", wake);
    window.addEventListener("keydown", key, { once: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("dg:wake", wake);
      window.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <>
      {chat ? <Capcom /> : <StaticOrb />}
      {eggs ? <EasterEggs /> : null}
    </>
  );
}

/** Applies the genome to <html> (concept attributes, theme default, per-site theme memory). */
function GenomeEffects({ site, preview }: { site: SiteData; preview: boolean }) {
  useEffect(() => {
    const el = document.documentElement;
    const attrs = genomeAttrs(site.genome);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    // The shell's static metadata can be (re)applied by the framework after hydration; keep the person's title.
    const title = `${site.resume.profile.name} — ${site.resume.profile.currentRole || site.resume.profile.headline}`;
    document.title = title;
    const mo = new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    });
    mo.observe(document.head, { subtree: true, childList: true, characterData: true });
    const stopTitle = window.setTimeout(() => mo.disconnect(), 5000);
    // theme: the visitor's choice for this site, else the genome's default. Never written to the
    // platform-wide preference; the studio preview remembers nothing at all.
    let stored: string | null = null;
    try {
      if (!preview) stored = localStorage.getItem(siteThemeKey(site.slug));
    } catch {}
    setThemeScope(preview ? false : siteThemeKey(site.slug));
    prefs.set({ theme: (stored as "light" | "dark") ?? site.genome.defaultTheme });
    return () => {
      mo.disconnect();
      clearTimeout(stopTitle);
      setThemeScope(null);
      // leaving the site (client navigation): go back to the platform-wide theme
      if (!preview) try {
        const g = (JSON.parse(localStorage.getItem("dg01.prefs") || "{}") as { theme?: "light" | "dark" }).theme;
        prefs.set({ theme: g ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") });
      } catch {}
      Object.keys(attrs).forEach((k) => el.removeAttribute(k));
    };
  }, [site, preview]);
  return null;
}

/** A complete portfolio site from (resume, genome, graph). Used by /site, /u/<slug>, previews and the showcase. */
export function SiteRenderer({ site, preview = false, progressive = false }: { site: SiteData; preview?: boolean; progressive?: boolean }) {
  // Client-rendered sites paint the hero first, then build the chapters in an interruptible
  // transition, so the first frame (and LCP) doesn't wait for the whole page.
  const [rest, setRest] = useState(!progressive);
  useEffect(() => {
    if (rest) return;
    const id = requestAnimationFrame(() => startTransition(() => setRest(true)));
    return () => cancelAnimationFrame(id);
  }, [rest]);
  return (
    <SiteProvider site={site}>
      <style id="genome-css" dangerouslySetInnerHTML={{ __html: genomeCss(site.genome) }} />
      <GenomeEffects site={site} preview={preview} />
      {preview ? null : <Boot />}
      <Nav />
      <main id="main">
        <Hero />
        {rest ? <Chapters /> : null}
      </main>
      {rest && !preview ? <Islands /> : null}
    </SiteProvider>
  );
}

function Chapters() {
  const site = useSite();
  return (
    <>
      {site.chapters
        .filter((c) => c.id !== "launch")
        .map((c) => (
          <Suspense key={c.id}>{SECTIONS[c.id as SectionId]()}</Suspense>
        ))}
    </>
  );
}
