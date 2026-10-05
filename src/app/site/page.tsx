import type { Metadata } from "next";
import { SiteShell } from "@/site/SiteShell";

export const metadata: Metadata = { title: "Portfolio" };

/** Static shell. At the edge, /u/<slug> serves this HTML with the person's site injected. */
export default function SitePage() {
  return <SiteShell />;
}
