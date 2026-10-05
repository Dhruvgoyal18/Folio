import { preloadPlatformFonts } from "@/app/platform-fonts";
import type { Metadata } from "next";
import { CreateApp } from "@/create/CreateApp";

export const metadata: Metadata = { title: "Create your portfolio — Folio", robots: { index: false } };

export default function CreatePage() {
  preloadPlatformFonts();
  return <CreateApp />;
}
