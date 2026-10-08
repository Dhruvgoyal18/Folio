"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Magnetic } from "@/components/primitives/Magnetic";
import { SplitText } from "@/components/primitives/SplitText";
import { Reveal } from "@/components/primitives/Reveal";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight, Download, GitHub, LinkedIn, Mail, Phone, Reticle } from "@/components/ui/icons";
import { useSite } from "@/site/SiteContext";
import { emit } from "@/lib/events";
import { useReducedMotion } from "@/lib/prefs";
import { tween } from "@/design/motion";
import Link from "next/link";

const ICON = { email: Mail, phone: Phone, linkedin: LinkedIn, github: GitHub, resume: Download, website: ArrowUpRight, other: ArrowUpRight } as const;

export function Comms() {
  const site = useSite();
  const { profile } = site.resume;
  const copy = site.genome.copy.sections.comms;
  const chapter = site.chapterOf("comms");
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    if (!profile.email) return;
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the mailto link still works */
    }
  };

  return (
    <section id="comms" aria-labelledby="comms-title" className="relative overflow-hidden px-gutter pb-[var(--sp-8)] pt-section" data-cite-id="contact">
      <p className="mono mb-6 text-[length:var(--fs--1)]">
        <span className="text-signal-ink">{chapter?.code}</span> <span className="eyebrow ml-3">{copy.eyebrow}</span>
      </p>
      <SplitText as="h2" id="comms-title" text={copy.title} by={copy.title.length > 18 ? "word" : "char"} className="hero-name display text-[length:var(--fs-7)]" />
      <div className="relative mt-[var(--sp-5)] h-6 w-[min(80vw,720px)]" aria-hidden>
        <svg viewBox="0 0 720 24" className="h-full w-full" preserveAspectRatio="none">
          <motion.path
            d="M2 14 C 120 2, 240 22, 360 12 S 600 4, 718 14"
            fill="none"
            stroke="var(--c-signal)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={tween("cinematic", "plot", 0.3)}
          />
        </svg>
      </div>

      <div className="mt-[var(--sp-7)] grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <p className="max-w-[44ch] text-[length:var(--fs-1)] leading-relaxed">
            {site.current ? `${site.first} is currently ${site.current.role} at ${site.current.orgShort}.` : `${site.first} is one message away.`} The links below go straight to {site.first}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {profile.email ? (
              <Magnetic>
                <Button href={`mailto:${profile.email}`} variant="signal" size="lg" cursorLabel="Write">
                  <Mail /> Email {site.first}
                </Button>
              </Magnetic>
            ) : null}
            <Magnetic>
              <Button variant="outline" size="lg" onClick={() => emit("dg:capcom", {})} cursorLabel="Ask">
                <Reticle /> Ask {site.genome.copy.assistant} first
              </Button>
            </Magnetic>
          </div>
          {profile.email ? (
            <button type="button" onClick={copyEmail} className="mono mt-2 inline-flex min-h-10 items-center text-[length:var(--fs--1)] text-ink-muted underline decoration-rule underline-offset-4 hover:text-ink" aria-live="polite">
              {copied ? "Copied to clipboard ✓" : `Copy ${profile.email}`}
            </button>
          ) : null}
        </Reveal>
        <Reveal className="lg:col-span-6" delay={0.1}>
          <ul className="divide-y divide-rule border-y border-rule" role="list">
            {profile.links.map((l) => {
              const Icon = ICON[l.kind];
              const external = l.href.startsWith("http");
              return (
                <li key={l.kind}>
                  <a
                    href={l.href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    {...(l.kind === "resume" ? { download: `${profile.name.replace(/\s+/g, "_")}_Resume.pdf` } : {})}
                    className="group flex items-center justify-between gap-4 py-4 no-underline"
                    data-cursor-label={l.kind === "resume" ? "PDF" : "Open"}
                  >
                    <span className="flex items-center gap-4">
                      <Icon />
                      <span className="text-[length:var(--fs-1)]">{l.label}</span>
                      {external ? <span className="sr-only">(opens in a new tab)</span> : null}
                    </span>
                    <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:-translate-y-0.5 group-hover:translate-x-1">
                      <ArrowUpRight />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>

      <footer className="mono mt-[var(--sp-9)] flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 text-[length:var(--fs--2)] uppercase tracking-[var(--tr-caps)] text-ink-muted">
        <span>
          © {new Date().getFullYear()} {profile.name} · {site.genome.copy.kicker} {profile.callsign}
        </span>
        <span className="flex flex-wrap gap-4">
          <Link href="/design-system" className="hover:text-ink">Design system</Link>
          <button type="button" onClick={() => emit("dg:terminal")} className="uppercase hover:text-ink min-h-10 inline-flex items-center">
            Terminal (~)
          </button>
          <span title="↑↑↓↓←→←→BA">Try the Konami code</span>
          <Link href="/" className="hover:text-ink">Made with Folio</Link>
        </span>
      </footer>
    </section>
  );
}
