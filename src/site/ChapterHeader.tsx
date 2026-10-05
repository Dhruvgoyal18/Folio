"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import type { SectionId } from "@/genome/schema";
import { useSite } from "./SiteContext";

/** Section header whose code, eyebrow, title and lede come from the site's genome copy. */
export function ChapterHeader({ id, className }: { id: SectionId; className?: string }) {
  const site = useSite();
  const c = site.genome.copy.sections[id];
  return <SectionHeader id={`${id}-title`} code={site.chapterOf(id)?.code ?? ""} eyebrow={c.eyebrow} title={c.title} lede={c.lede} className={className} />;
}
