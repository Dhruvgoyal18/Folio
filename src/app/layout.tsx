import type { Metadata, Viewport } from "next";
import { themeBootScript } from "@/lib/theme-boot";
import { palette } from "@/design/tokens";
import { Shell } from "@/components/providers/Shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://folio.pages.dev"),
  title: "Folio — your resume, as a one-of-a-kind interactive portfolio",
  description: "Upload a resume and get a cinematic, accessible portfolio with an AI assistant that answers only from your resume. Every site is designed from its own genome.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: palette.light.paper },
    { media: "(prefers-color-scheme: dark)", color: palette.dark.paper },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-motion="full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="grain bg-paper text-ink">
        <a href="#main" className="sr-only-focusable fixed left-4 top-4 rounded-pill bg-ink px-4 py-2 text-paper" style={{ zIndex: "var(--z-boot)" }}>
          Skip to content
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
