import { palette } from "@/design/tokens";
import { seedResume } from "@/data/seed";
import { generateGenome, seedFrom } from "@/genome/generate";
import type { Genome } from "@/genome/schema";

export const SHOWCASE_SLUG = "dhruv-goyal";

/**
 * The original hand-directed "Mission Log DG-01" design, expressed as a genome — proof that the
 * engine can reproduce a bespoke site exactly, and the platform's showcase.
 */
export function signatureGenome(): Genome {
  const base = generateGenome(seedResume, { seed: seedFrom(SHOWCASE_SLUG), concept: "mission" });
  return {
    ...base,
    paletteRecipe: "paper",
    accentHue: 38,
    paperHue: 80,
    palette: { light: { ...palette.light }, dark: { ...palette.dark } },
    defaultTheme: "light",
    fonts: "grotesk",
    hero: "constellation",
    motion: "cinematic",
    density: "airy",
    radius: "soft",
    texture: "grid",
    order: "story",
    sections: { telemetry: "dials", trajectory: "rail", payload: "graph", missions: "cards" },
    copy: {
      assistant: "CAPCOM",
      kicker: "Mission log",
      heroCta: "Ask CAPCOM about me",
      codeStyle: "numeric",
      sections: {
        telemetry: { eyebrow: "Telemetry", title: "Impact, by the numbers.", lede: "Six outcomes across four roles, each quoted from a résumé bullet. Open a source to read the exact line." },
        trajectory: { eyebrow: "Trajectory", title: "The flight path, waypoint by waypoint.", lede: "Four roles, from sales forecasting to multi-agent infrastructure. Latest first; open any waypoint for the full log." },
        payload: { eyebrow: "Payload", title: "Skills, wired to where they were used.", lede: "Every line in this graph comes from a bullet that names the skill. Hover, tap or tab through a skill to light up the roles and missions behind it." },
        missions: { eyebrow: "Missions", title: "Case files, opened on request.", lede: "Eight case files, strongest first. Each is built only from résumé bullets and linked back to the role that produced it." },
        training: { eyebrow: "Ground training & honors", title: "Where the engineering started." },
        comms: { eyebrow: "Comms", title: "Open a channel." },
      },
    },
  };
}
