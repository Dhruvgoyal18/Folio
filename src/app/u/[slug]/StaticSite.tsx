"use client";

import { SiteRenderer } from "@/site/SiteRenderer";
import type { SiteData } from "@/site/model";
import { applyMotionPersonality } from "@/genome/apply";

export function StaticSite({ site }: { site: SiteData }) {
  applyMotionPersonality(site.genome.motion);
  return <SiteRenderer site={site} />;
}
