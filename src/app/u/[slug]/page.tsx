import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { builtinSite } from "@/server/builtins";
import { SHOWCASE_SLUG } from "@/site/showcase";
import { StaticSite } from "./StaticSite";
import { jsonForScript } from "@/server/render";
import { themeBootScript } from "@/lib/theme-boot";

/** Built-in sites (the showcase) are prerendered in full; published sites go through the /site shell at the edge. */
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ slug: SHOWCASE_SLUG }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = builtinSite((await params).slug);
  if (!site) return {};
  const p = site.resume.profile;
  return { title: `${p.name} — ${p.currentRole}`, description: p.headline, openGraph: { title: p.name, description: p.headline, type: "profile" } };
}

export default async function BuiltinSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const site = builtinSite((await params).slug);
  if (!site) notFound();
  // Same contract as edge-injected pages: site meta + theme before first paint.
  const boot = `window.__SITE_META__=${jsonForScript({ slug: site.slug, theme: site.genome.defaultTheme })};${themeBootScript}`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <StaticSite site={site} />
    </>
  );
}
