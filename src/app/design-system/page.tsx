import { preloadPlatformFonts } from "@/app/platform-fonts";
import type { Metadata } from "next";
import { DesignSystem } from "./DesignSystem";

export const metadata: Metadata = {
  title: "Design & Motion System — Folio",
  description: "Tokens, motion language, genome and primitives behind every Folio portfolio, with live controls.",
};

export default function Page() {
  preloadPlatformFonts();
  return (
    <main id="main">
      <DesignSystem />
    </main>
  );
}
