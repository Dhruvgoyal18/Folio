import type { Genome, SectionId } from "./schema";
import type { PairingId } from "./fonts";
import type { PaletteRecipe } from "./palette";

/**
 * A concept is an art-direction "family". It constrains which fonts, palettes, hero visuals,
 * motion and section variants may be combined, and supplies the copy voice. The generator picks
 * within these constraints, so two sites in the same concept still differ, and every pick is
 * known-good.
 */

type Weighted<T> = Array<[T, number]>;

export type ConceptDef = {
  label: string;
  blurb: string;
  palettes: Weighted<PaletteRecipe>;
  /** accent hue bands (degrees) to pick from */
  accentHues: Array<[number, number]>;
  paperHues: Array<[number, number]>;
  defaultTheme: Weighted<"light" | "dark">;
  fonts: Weighted<PairingId>;
  heroes: Weighted<Genome["hero"]>;
  motions: Weighted<Genome["motion"]>;
  radii: Weighted<Genome["radius"]>;
  textures: Weighted<Genome["texture"]>;
  densities: Weighted<Genome["density"]>;
  orders: Weighted<Genome["order"]>;
  variants: { [K in keyof Genome["sections"]]: Weighted<Genome["sections"][K]> };
  codeStyle: Genome["copy"]["codeStyle"];
  assistants: string[];
  kickers: string[];
  ctas: string[];
  copy: Record<SectionId, Array<{ eyebrow: string; title: string; lede?: string }>>;
};

export const CONCEPT_DEFS: Record<Genome["concept"], ConceptDef> = {
  mission: {
    label: "Mission Control",
    blurb: "A career as a mission dossier on drafting paper: telemetry, trajectory, payload.",
    palettes: [["paper", 4], ["studio", 1]],
    accentHues: [[18, 48], [140, 165], [200, 250], [330, 355]],
    paperHues: [[60, 95]],
    defaultTheme: [["light", 3], ["dark", 1]],
    fonts: [["grotesk", 4], ["technical", 2], ["neo", 1]],
    heroes: [["constellation", 5], ["contours", 2]],
    motions: [["cinematic", 3], ["snappy", 2]],
    radii: [["soft", 3], ["sharp", 1]],
    textures: [["grid", 4], ["grain", 1]],
    densities: [["airy", 3], ["compact", 1]],
    orders: [["story", 4], ["work-first", 1], ["skills-first", 1]],
    variants: {
      telemetry: [["dials", 4], ["strip", 1]],
      trajectory: [["rail", 4], ["ledger", 1]],
      payload: [["graph", 4], ["bars", 1]],
      missions: [["cards", 3], ["index", 1]],
    },
    codeStyle: "numeric",
    assistants: ["CAPCOM", "Ground Control", "Flight Desk"],
    kickers: ["Mission log", "Flight plan", "Mission dossier"],
    ctas: ["Ask {assistant} about me", "Talk to {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "Telemetry", title: "Readouts from the logbook.", lede: "{kpiCount} numbers, each quoted from a resume line." },
        { eyebrow: "Telemetry", title: "Instruments, all green.", lede: "{kpiCount} measured results, straight from the record." },
      ],
      trajectory: [
        { eyebrow: "Trajectory", title: "The flight path, waypoint by waypoint.", lede: "{roleCount} roles. Open any waypoint for the full log." },
        { eyebrow: "Trajectory", title: "Course plotted so far.", lede: "{roleCount} waypoints, oldest first. Each one opens." },
      ],
      payload: [
        { eyebrow: "Payload", title: "Skills, wired to where they were used.", lede: "Every link comes from a line that names the skill. Pick one to light up its roles." },
        { eyebrow: "Payload", title: "What's on board.", lede: "{skillCount} skills, connected only where the resume shows them in use." },
      ],
      missions: [
        { eyebrow: "Missions", title: "Case files, opened on request.", lede: "{projectCount} missions, each built from resume lines and linked to its source." },
        { eyebrow: "Missions", title: "Completed missions.", lede: "{projectCount} case files. Open one for the full debrief." },
      ],
      training: [
        { eyebrow: "Ground training & honors", title: "Where the engineering started." },
        { eyebrow: "Training & honors", title: "Qualifications on file." },
      ],
      comms: [{ eyebrow: "Comms", title: "Open a channel." }, { eyebrow: "Comms", title: "Request contact." }],
    },
  },
  editorial: {
    label: "Editorial",
    blurb: "A magazine feature: big serif headlines, generous whitespace, calm motion.",
    palettes: [["gallery", 4], ["studio", 1]],
    accentHues: [[0, 30], [25, 60], [140, 170], [215, 265], [280, 320]],
    paperHues: [[60, 100]],
    defaultTheme: [["light", 5], ["dark", 1]],
    fonts: [["editorial", 5], ["swiss", 2]],
    heroes: [["contours", 3], ["flowfield", 2], ["constellation", 1]],
    motions: [["calm", 5], ["cinematic", 1]],
    radii: [["sharp", 4], ["soft", 1]],
    textures: [["none", 3], ["grain", 2]],
    densities: [["airy", 4], ["compact", 1]],
    orders: [["work-first", 3], ["story", 2]],
    variants: {
      telemetry: [["strip", 4], ["dials", 1]],
      trajectory: [["ledger", 4], ["rail", 1]],
      payload: [["bars", 3], ["graph", 1]],
      missions: [["index", 4], ["cards", 1]],
    },
    codeStyle: "section",
    assistants: ["Concierge", "The Desk", "Editor"],
    kickers: ["Portfolio, Vol. 1", "A profile", "The feature"],
    ctas: ["Ask the {assistant}", "Questions? Ask the {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "By the numbers", title: "The results, in brief.", lede: "{kpiCount} figures, quoted as written." },
        { eyebrow: "Figures", title: "What changed, measurably.", lede: "Each number links back to the line it came from." },
      ],
      trajectory: [
        { eyebrow: "Career", title: "A working history.", lede: "{roleCount} roles, in order. Read any entry in full." },
        { eyebrow: "Chronology", title: "Where the work happened.", lede: "{roleCount} positions, earliest first." },
      ],
      payload: [
        { eyebrow: "Craft", title: "Tools of the trade.", lede: "Grouped by discipline, weighted by how often the work shows them." },
        { eyebrow: "Skills", title: "The working toolkit.", lede: "{skillCount} skills, and where each appears in the work." },
      ],
      missions: [
        { eyebrow: "Selected work", title: "Projects worth a closer look.", lede: "{projectCount} pieces. Open any one for the details." },
        { eyebrow: "Index", title: "Selected work.", lede: "{projectCount} entries, each drawn from the record." },
      ],
      training: [
        { eyebrow: "Education & recognition", title: "Foundations." },
        { eyebrow: "Background", title: "Schooling and honours." },
      ],
      comms: [{ eyebrow: "Correspondence", title: "Write to {first}." }, { eyebrow: "Contact", title: "Let's talk." }],
    },
  },
  terminal: {
    label: "Terminal",
    blurb: "A command-line portfolio: phosphor colours, monospace, crisp and quick.",
    palettes: [["phosphor", 5], ["studio", 1]],
    accentHues: [[120, 160], [70, 95], [180, 210], [290, 330]],
    paperHues: [[200, 260]],
    defaultTheme: [["dark", 5], ["light", 1]],
    fonts: [["terminal", 5], ["technical", 2]],
    heroes: [["flowfield", 4], ["constellation", 2]],
    motions: [["snappy", 5], ["cinematic", 1]],
    radii: [["sharp", 5], ["soft", 1]],
    textures: [["scanlines", 3], ["grid", 2], ["none", 1]],
    densities: [["compact", 3], ["airy", 1]],
    orders: [["skills-first", 2], ["story", 2], ["work-first", 1]],
    variants: {
      telemetry: [["strip", 3], ["dials", 2]],
      trajectory: [["ledger", 3], ["rail", 2]],
      payload: [["bars", 2], ["graph", 3]],
      missions: [["index", 3], ["cards", 2]],
    },
    codeStyle: "path",
    assistants: ["shell", "copilot", "daemon"],
    kickers: ["~/portfolio", "$ whoami", "./resume --interactive"],
    ctas: ["$ ask {assistant}", "Query the {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "stats", title: "cat metrics.log", lede: "{kpiCount} numbers, grepped straight from the resume." },
        { eyebrow: "stats", title: "Benchmarks.", lede: "{kpiCount} measured outputs. No synthetic data." },
      ],
      trajectory: [
        { eyebrow: "history", title: "git log --career", lede: "{roleCount} commits to the career branch. Expand any for the diff." },
        { eyebrow: "history", title: "Process tree.", lede: "{roleCount} roles, oldest first." },
      ],
      payload: [
        { eyebrow: "deps", title: "Installed packages.", lede: "{skillCount} skills; links only where a line imports them." },
        { eyebrow: "deps", title: "ls ./skills", lede: "Grouped by namespace, weighted by usage." },
      ],
      missions: [
        { eyebrow: "projects", title: "ls ./projects", lede: "{projectCount} repos. Open one for the README." },
        { eyebrow: "projects", title: "Shipped builds.", lede: "{projectCount} builds, each traced to its source." },
      ],
      training: [{ eyebrow: "education", title: "Boot sequence." }, { eyebrow: "education", title: "Compiled from source." }],
      comms: [{ eyebrow: "contact", title: "ping {first}" }, { eyebrow: "contact", title: "Open a connection." }],
    },
  },
};

/** How strongly a resume suggests each concept (keyword affinity), before seeded randomness. */
export function conceptAffinity(text: string): Record<Genome["concept"], number> {
  const t = text.toLowerCase();
  const count = (words: string[]) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const tech = count(["engineer", "developer", "software", "machine learning", "ml", "ai ", "data", "python", "backend", "devops", "cloud", "robot", "infra", "llm", "sql"]);
  const hacker = count(["security", "linux", "systems", "kernel", "rust", "golang", "terminal", "open source", "devops", "sre", "embedded", "cli", "compiler"]);
  const creative = count(["design", "designer", "writer", "editor", "journal", "marketing", "brand", "product manager", "research", "content", "ux", "ui ", "architect", "illustrat", "photograph", "copy", "communications", "policy", "law", "finance", "consult"]);
  return {
    mission: 1 + tech * 1.2,
    terminal: 0.6 + hacker * 1.5 + tech * 0.5,
    editorial: 1 + creative * 1.4,
  };
}
