"use client";

import { useEffect, useState } from "react";
import { SiteRenderer } from "./SiteRenderer";
import type { SiteData } from "./model";
import { applyMotionPersonality } from "@/genome/apply";
import { CONCEPTS, type Concept } from "@/genome/schema";

/**
 * The generic page every published site is rendered from. Data arrives one of three ways:
 *  1. production: the edge injects <script id="site-data"> into this shell (/u/<slug>)
 *  2. preview:    /site?preview=1 inside the studio iframe receives the draft site by postMessage
 *  3. demo/dev:   /site?demo=<concept>&seed=<n> renders the showcase résumé with a fresh genome;
 *                 /site?slug=<slug> fetches a published site from the API (next dev)
 */
export type PreviewMessage = { type: "folio:site"; site: SiteData; scrollTo?: string };

function readInjected(): SiteData | null {
  const el = typeof document !== "undefined" ? document.getElementById("site-data") : null;
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as SiteData;
  } catch {
    return null;
  }
}

export function SiteShell() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [rev, setRev] = useState(0);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = (s: SiteData) => {
    applyMotionPersonality(s.genome.motion);
    setSite(s);
    setRev((r) => r + 1);
  };

  useEffect(() => {
    const injected = readInjected();
    if (injected) return show(injected);
    const q = new URLSearchParams(location.search);
    if (q.has("preview")) {
      setPreview(true);
      const onMsg = (e: MessageEvent) => {
        if (e.origin !== location.origin || e.source !== window.parent) return;
        const m = e.data as PreviewMessage;
        if (m?.type === "folio:site" && m.site?.resume && m.site.genome) {
          // keep the reader's place when the studio sends a remix
          const y = window.scrollY;
          show(m.site);
          if (y > 0) {
            // chapters render progressively — wait until the page is tall enough, then return to the same place
            const until = performance.now() + 2500;
            const restore = () => {
              if (document.documentElement.scrollHeight >= y + innerHeight || performance.now() > until) {
                const l = (window as Window & { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
                if (l) l.scrollTo(y, { immediate: true, force: true });
                window.scrollTo(0, y);
              } else requestAnimationFrame(restore);
            };
            requestAnimationFrame(restore);
          }
        }
      };
      window.addEventListener("message", onMsg);
      window.parent.postMessage({ type: "folio:ready" }, location.origin);
      return () => window.removeEventListener("message", onMsg);
    }
    const slug = q.get("slug");
    if (slug) {
      fetch(`/api/sites/${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? (r.json() as Promise<SiteData>) : Promise.reject<SiteData>(new Error(r.status === 404 ? "No site at that address." : "Couldn't load that site."))))
        .then((s: SiteData) => show(s))
        .catch((e: Error) => setError(e.message));
      return;
    }
    // demo: the showcase résumé, re-designed by a fresh genome
    Promise.all([import("@/data/seed"), import("@/genome/generate"), import("@/lib/skill-graph")]).then(([{ seedResume }, { generateGenome }, { computeSkillGraph }]) => {
      const c = q.get("demo");
      const concept = (CONCEPTS as readonly string[]).includes(c ?? "") ? (c as Concept) : undefined;
      const seed = Number(q.get("seed") ?? 0) || Math.floor(Math.random() * 2 ** 31);
      show({ slug: "dhruv-goyal", resume: seedResume, genome: generateGenome(seedResume, { seed, concept }), graph: computeSkillGraph(seedResume) });
    });
  }, []);

  if (error)
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6">
        <h1 className="display text-[length:var(--fs-3)]">{error}</h1>
        <a className="underline" href="/create">Make your own portfolio →</a>
      </main>
    );
  if (!site) return <main id="main" aria-busy="true" className="min-h-dvh" />;
  return <SiteRenderer key={rev} site={site} preview={preview} progressive />;
}
