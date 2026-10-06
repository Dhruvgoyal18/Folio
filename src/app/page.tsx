import { preloadPlatformFonts } from "@/app/platform-fonts";
import Link from "next/link";
import { seedResume } from "@/data/seed";
import { generateGenome } from "@/genome/generate";
import { CONCEPT_DEFS } from "@/genome/concepts";
import { PAIRINGS, stack } from "@/genome/fonts";
import { CONCEPTS, type Concept, type Genome } from "@/genome/schema";
import { TEMPLATE_SEEDS, templateGenome } from "@/genome/templates";
import { TemplateMock } from "@/components/platform/TemplateMock";
import { SHOWCASE_SLUG } from "@/site/showcase";
import { ArrowUpRight } from "@/components/ui/icons";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

/** Same résumé, three genomes — computed at build time, rendered as specimen cards. */
/** Six of the nine templates on the landing page; the gallery has them all. */
const SHOWCASE: Concept[] = ["mission", "minimal", "aurora", "noir", "brutalist", "scholar"];

const DEMOS: Array<{ concept: Concept; seed: number }> = [
  { concept: "mission", seed: 11 },
  { concept: "editorial", seed: 23 },
  { concept: "terminal", seed: 37 },
];

/** Hero visual: the three example genomes as a fanned stack of mini sites. */
function Fan({ genomes }: { genomes: Genome[] }) {
  const name = seedResume.profile.name;
  return (
    <div className="relative mx-auto hidden aspect-[5/4] w-full max-w-[480px] lg:block" aria-hidden="true">
      {genomes.map((g, i) => {
        const p = g.palette[g.defaultTheme];
        const f = PAIRINGS[g.fonts];
        const rot = [-7, 2, 9][i]!;
        const off = [[0, 8], [14, 2], [28, 12]][i]!;
        return (
          <div
            key={g.concept}
            className="fan-card absolute left-0 top-[6%] flex aspect-[4/3] w-[78%] flex-col justify-between rounded-lg border p-5 shadow-lifted"
            style={{ background: p.paper, color: p.ink, borderColor: p.rule, transform: `translate(${off[0]}%, ${off[1]}%) rotate(${rot}deg)`, zIndex: i, ["--i" as string]: i }}
          >
            <div className="flex justify-between text-[12px]" style={{ fontFamily: stack(f.mono), color: p["ink-muted"] }}>
              <span>{g.copy.kicker}</span>
              <span>● {g.copy.assistant}</span>
            </div>
            <p className="leading-[0.9]" style={{ fontFamily: stack(f.display), fontWeight: f.displayWeight, letterSpacing: f.tracking, textTransform: f.uppercaseHero ? "uppercase" : "none", fontSize: "2.1rem", color: i === 1 ? p["signal-ink"] : p.ink }}>
              {name}
            </p>
            <div className="flex items-end gap-1.5">
              {[0.5, 0.8, 0.35, 0.95, 0.6, 0.75].map((h, k) => (
                <span key={k} className="w-3 rounded-sm" style={{ height: `${h * 44}px`, background: k === 3 ? p.signal : p["paper-sunk"], border: `1px solid ${p.rule}` }} />
              ))}
              <span className="ml-auto rounded-full px-3 py-1 text-[12px]" style={{ background: p["signal-ink"], color: p["on-signal"], fontFamily: stack(f.mono) }}>
                {g.copy.heroCta}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STEPS = [
  { n: "01", t: "Upload", d: "Drop in a PDF or DOCX, or paste text. The file is read in your browser; only its text is sent to be structured." },
  { n: "02", t: "Review", d: "Check every role, bullet and date before anything is published. Folio never invents facts: each number on your site is quoted from a bullet." },
  { n: "03", t: "Design", d: "Your résumé gets its own design genome: concept, palette, type, hero, layout, motion and voice. Remix it, and lock the parts you like." },
  { n: "04", t: "Publish", d: "Pick an address. You get a public link and a private edit link — no account needed." },
];

const PROMISES = [
  { t: "Grounded assistant", d: "Visitors can ask about your experience. It answers only from your résumé, cites the section it used, and declines everything else." },
  { t: "Accessible by construction", d: "Every generated palette is checked against WCAG AA before it can ship. Keyboard, screen-reader and reduced-motion support come built in." },
  { t: "Fast everywhere", d: "Static pages at the edge, fonts that only load when used, and 3D only when the device can handle it." },
  { t: "Yours to change", d: "Start from any of nine templates, remix it, edit content or redesign at any time with your edit link — or delete the site entirely." },
];

export default function Landing() {
  preloadPlatformFonts();
  const demos = DEMOS.map((d) => generateGenome(seedResume, d));
  return (
    <div className="app">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-[var(--sp-gutter)] py-4">
        <Link href="/" className="display text-[length:var(--fs-1)] no-underline">
          Folio<span className="text-signal-ink">.</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link href={`/u/${SHOWCASE_SLUG}`} className="btn btn-ghost no-underline">Example</Link>
          <Link href="/templates" className="btn btn-ghost no-underline" data-testid="nav-templates">Templates</Link>
          <Link href="/design-system" className="btn btn-ghost no-underline max-lg:hidden">Design system</Link>
          <ThemeSwitch />
          <Link href="/create" className="btn btn-primary ml-1 no-underline">Create yours</Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto max-w-[1200px] px-[var(--sp-gutter)] grid items-center gap-12 overflow-x-clip pb-20 pt-8 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">Résumé → portfolio</p>
            <h1 className="display mt-4 max-w-[14ch] text-[length:var(--fs-5)] leading-[1.02]">
              Your résumé, as a site <span className="text-signal-ink">nobody else has.</span>
            </h1>
            <p className="mt-5 max-w-[50ch] text-[length:var(--fs-1)] leading-relaxed text-ink-muted">
              Upload your résumé. Folio turns it into an interactive portfolio with its own design and an assistant that answers questions from your résumé alone.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/create" className="btn btn-primary btn-lg no-underline" data-testid="cta-create">
                Create your site <ArrowUpRight size={18} />
              </Link>
              <Link href={`/u/${SHOWCASE_SLUG}`} className="btn btn-outline btn-lg no-underline">
                See an example
              </Link>
            </div>
          </div>
          <Fan genomes={demos} />
        </section>

        <section aria-labelledby="variety" className="border-y border-rule bg-paper-sunk">
          <div className="mx-auto max-w-[1200px] px-[var(--sp-gutter)] py-14">
            <p className="kicker">Same PDF, nine templates</p>
            <h2 id="variety" className="display mt-2 text-[length:var(--fs-3)]">One résumé, many different sites.</h2>
            <p className="mt-3 max-w-[60ch] text-ink-muted">
              These all come from the same PDF. Each template is a design family; within it, every site gets its own palette, type pairing, hero, section layouts, motion and wording. Open one to see the whole site.
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {SHOWCASE.map((c, i) => (
                <li key={c} className="specimen" style={{ ["--i" as string]: i }}>
                  <Link
                    href={`/site?demo=${c}&seed=${TEMPLATE_SEEDS[c]}`}
                    className="group block overflow-hidden rounded-lg border border-rule no-underline shadow-paper transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-1"
                    aria-label={`Open the ${CONCEPT_DEFS[c].label} version of the example site`}
                  >
                    <TemplateMock g={templateGenome(seedResume, c)} resume={seedResume} className="aspect-[4/3] w-full overflow-hidden" />
                    <div className="flex items-center justify-between border-t border-rule bg-paper-raised px-5 py-3">
                      <span className="text-[length:var(--fs--1)] font-medium">{CONCEPT_DEFS[c].label}</span>
                      <span className="mono flex items-center gap-1 text-[length:var(--fs--2)] text-ink-muted group-hover:text-ink">
                        {CONCEPT_DEFS[c].bestFor.split(/[,—]/)[0]!.trim()} <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/templates" className="btn btn-outline mt-8 no-underline" data-testid="all-templates">
              Browse all {CONCEPTS.length} templates <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>

        <section aria-labelledby="how" className="mx-auto max-w-[1200px] px-[var(--sp-gutter)] py-16">
          <h2 id="how" className="display text-[length:var(--fs-3)]">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t border-rule pt-4">
                <span className="mono text-[length:var(--fs--1)] text-signal-ink">{s.n}</span>
                <h3 className="mt-2 text-[length:var(--fs-1)] font-semibold">{s.t}</h3>
                <p className="mt-2 text-ink-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="promises" className="mx-auto max-w-[1200px] px-[var(--sp-gutter)] pb-24">
          <h2 id="promises" className="display text-[length:var(--fs-3)]">What every Folio site includes</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <div key={p.t}>
                <dt className="text-[length:var(--fs-1)] font-semibold">{p.t}</dt>
                <dd className="mt-2 text-ink-muted">{p.d}</dd>
              </div>
            ))}
          </dl>
          <Link href="/create" className="btn btn-accent btn-lg mt-10 no-underline">
            Start with your résumé <ArrowUpRight size={16} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-[var(--sp-gutter)] py-8 text-[length:var(--fs--1)] text-ink-muted">
          <span>Folio — résumé-grounded portfolios.</span>
          <span className="mono">Built on Cloudflare Pages</span>
        </div>
      </footer>
    </div>
  );
}
