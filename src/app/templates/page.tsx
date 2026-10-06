import type { Metadata } from "next";
import Link from "next/link";
import { preloadPlatformFonts } from "@/app/platform-fonts";
import { seedResume } from "@/data/seed";
import { TEMPLATES, templateGenome } from "@/genome/templates";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { TemplateMock } from "@/components/platform/TemplateMock";
import { TemplateGallery } from "./TemplateGallery";

export const metadata: Metadata = {
  title: "Templates — Folio",
  description: "Nine portfolio templates — Mission Control, Editorial, Terminal, Minimal, Noir, Bold, Aurora, Scholar and Blueprint. Preview any of them live, remix it, and publish with your résumé.",
};

export default function TemplatesPage() {
  preloadPlatformFonts();
  // genomes are computed at build time; the gallery only renders them
  const items = TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    blurb: t.blurb,
    bestFor: t.bestFor,
    seed: t.seed,
    mock: <TemplateMock g={templateGenome(seedResume, t.id)} resume={seedResume} className="aspect-[4/3] w-full overflow-hidden" />,
  }));
  return (
    <div className="app">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-[var(--sp-gutter)] py-4">
        <Link href="/" className="display text-[length:var(--fs-1)] no-underline">
          Folio<span className="text-signal-ink">.</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link href="/u/dhruv-goyal" className="btn btn-ghost no-underline max-sm:hidden">Example</Link>
          <ThemeSwitch />
          <Link href="/create" className="btn btn-primary ml-1 no-underline">Create yours</Link>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-[1200px] px-[var(--sp-gutter)] pb-24 pt-6 sm:pt-10">
        <p className="kicker">Templates</p>
        <h1 className="display mt-2 max-w-[20ch] text-[length:var(--fs-5)] leading-[1.02]">Nine looks. Every one is yours to remix.</h1>
        <p className="mt-4 max-w-[62ch] text-[length:var(--fs-1)] text-ink-muted">
          Each template is a design family, not a fixed theme. Preview one live with an example résumé, remix it until it feels right, then publish it with yours. Every palette passes WCAG AA, and every template works on phones.
        </p>
        <TemplateGallery items={items} />
      </main>
    </div>
  );
}
