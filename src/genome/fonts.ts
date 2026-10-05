/**
 * Curated, self-hosted (OFL) font pairings. Every family is declared with @font-face in
 * src/app/fonts.css; browsers only download the files a page actually uses, so a site
 * pays for its own pairing and nothing else.
 */
export const FAMILIES = {
  "bricolage-grotesque": { css: "'Bricolage Grotesque'", fallback: "'Arial Narrow', system-ui, sans-serif", weight: "200 800" },
  "instrument-sans": { css: "'Instrument Sans'", fallback: "system-ui, sans-serif", weight: "400 700" },
  "jetbrains-mono": { css: "'JetBrains Mono'", fallback: "ui-monospace, monospace", weight: "100 800" },
  fraunces: { css: "'Fraunces'", fallback: "Georgia, serif", weight: "100 900" },
  newsreader: { css: "'Newsreader'", fallback: "Georgia, serif", weight: "200 800" },
  "inter-tight": { css: "'Inter Tight'", fallback: "system-ui, sans-serif", weight: "100 900" },
  inter: { css: "'Inter'", fallback: "system-ui, sans-serif", weight: "100 900" },
  "ibm-plex-sans": { css: "'IBM Plex Sans'", fallback: "system-ui, sans-serif", weight: "100 700" },
  syne: { css: "'Syne'", fallback: "system-ui, sans-serif", weight: "400 800" },
  manrope: { css: "'Manrope'", fallback: "system-ui, sans-serif", weight: "200 800" },
  "space-grotesk": { css: "'Space Grotesk'", fallback: "system-ui, sans-serif", weight: "300 700" },
} as const;
export type FamilyId = keyof typeof FAMILIES;

export const PAIRINGS = {
  grotesk: { label: "Grotesk", display: "bricolage-grotesque", text: "instrument-sans", mono: "jetbrains-mono", displayWeight: 800, tracking: "-0.035em", uppercaseHero: true },
  editorial: { label: "Editorial serif", display: "fraunces", text: "newsreader", mono: "jetbrains-mono", displayWeight: 600, tracking: "-0.02em", uppercaseHero: false },
  swiss: { label: "Swiss", display: "inter-tight", text: "inter", mono: "jetbrains-mono", displayWeight: 800, tracking: "-0.045em", uppercaseHero: false },
  terminal: { label: "Terminal", display: "jetbrains-mono", text: "ibm-plex-sans", mono: "jetbrains-mono", displayWeight: 700, tracking: "-0.04em", uppercaseHero: true },
  neo: { label: "Neo-grotesk", display: "syne", text: "manrope", mono: "jetbrains-mono", displayWeight: 800, tracking: "-0.03em", uppercaseHero: true },
  technical: { label: "Technical", display: "space-grotesk", text: "inter", mono: "jetbrains-mono", displayWeight: 700, tracking: "-0.04em", uppercaseHero: false },
} as const satisfies Record<string, { label: string; display: FamilyId; text: FamilyId; mono: FamilyId; displayWeight: number; tracking: string; uppercaseHero: boolean }>;
export type PairingId = keyof typeof PAIRINGS;
export const PAIRING_IDS = Object.keys(PAIRINGS) as PairingId[];

export const stack = (f: FamilyId) => `${FAMILIES[f].css}, ${FAMILIES[f].fallback}`;

export function fontFaceCss(): string {
  return (Object.keys(FAMILIES) as FamilyId[])
    .map((id) => `@font-face{font-family:${FAMILIES[id].css};src:url("/fonts/${id}.woff2") format("woff2");font-weight:${FAMILIES[id].weight};font-style:normal;font-display:swap;}`)
    .join("\n");
}
