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

/** Hero composition each concept uses (the layout; the visual inside it is the genome's `hero`). */
export type HeroLayout = "mission" | "editorial" | "terminal" | "minimal" | "poster" | "noir" | "aurora" | "paper";

export type ConceptDef = {
  label: string;
  blurb: string;
  /** who the template suits — shown in the gallery */
  bestFor: string;
  heroLayout: HeroLayout;
  /** the assistant's first line */
  greeting: string;
  /** nav label for the hero chapter */
  launchLabel: string;
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
    bestFor: "Engineers, data & ML, robotics",
    heroLayout: "mission",
    greeting: "Ground control here.",
    launchLabel: "Launch",
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
        { eyebrow: "Trajectory", title: "Course plotted so far.", lede: "{roleCount} waypoints, latest first. Each one opens." },
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
    bestFor: "Product, design, writing, consulting",
    heroLayout: "editorial",
    greeting: "Welcome.",
    launchLabel: "Cover",
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
        { eyebrow: "Career", title: "A working history.", lede: "{roleCount} roles, most recent first. Read any entry in full." },
        { eyebrow: "Chronology", title: "Where the work happened.", lede: "{roleCount} positions, most recent first." },
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
    bestFor: "Backend, infra, security, open source",
    heroLayout: "terminal",
    greeting: "Connected.",
    launchLabel: "init",
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
        { eyebrow: "history", title: "Process tree.", lede: "{roleCount} roles, newest first." },
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
  minimal: {
    label: "Minimal",
    blurb: "Swiss restraint: white space, one accent colour, nothing extra.",
    bestFor: "Anyone — the safest choice for recruiters",
    heroLayout: "minimal",
    greeting: "Hi.",
    launchLabel: "Intro",
    palettes: [["gallery", 4], ["pastel", 1]],
    accentHues: [[0, 30], [20, 50], [140, 170], [200, 260]],
    paperHues: [[60, 100]],
    defaultTheme: [["light", 5], ["dark", 1]],
    fonts: [["minimal", 5], ["swiss", 2]],
    heroes: [["monogram", 3], ["contours", 2]],
    motions: [["calm", 4], ["snappy", 2]],
    radii: [["sharp", 3], ["soft", 2]],
    textures: [["none", 1]],
    densities: [["airy", 3], ["compact", 1]],
    orders: [["work-first", 3], ["story", 2]],
    variants: {
      telemetry: [["dials", 3], ["strip", 2]],
      trajectory: [["ledger", 4], ["rail", 1]],
      payload: [["bars", 4], ["graph", 1]],
      missions: [["index", 2], ["cards", 3]],
    },
    codeStyle: "numeric",
    assistants: ["Assistant", "Guide", "Index"],
    kickers: ["Portfolio", "Selected work", "Profile"],
    ctas: ["Ask the {assistant}", "Ask about my work"],
    copy: {
      telemetry: [
        { eyebrow: "Impact", title: "Results that moved the numbers.", lede: "{kpiCount} outcomes, each quoted from the résumé." },
        { eyebrow: "Impact", title: "Measured outcomes.", lede: "{kpiCount} results. Open any source to read the line it came from." },
      ],
      trajectory: [
        { eyebrow: "Experience", title: "Where I've worked.", lede: "{roleCount} roles, most recent first." },
        { eyebrow: "Experience", title: "Experience.", lede: "{roleCount} roles. Open one for the details." },
      ],
      payload: [
        { eyebrow: "Skills", title: "What I work with.", lede: "{skillCount} skills, grouped by discipline and weighted by use." },
        { eyebrow: "Skills", title: "Tools and methods.", lede: "Grouped by discipline; bars show how often the work uses each." },
      ],
      missions: [
        { eyebrow: "Work", title: "Selected projects.", lede: "{projectCount} projects. Open one for the details." },
        { eyebrow: "Work", title: "Things I've built.", lede: "{projectCount} projects, each traced to its source." },
      ],
      training: [
        { eyebrow: "Education & awards", title: "Background." },
        { eyebrow: "Education", title: "Education and recognition." },
      ],
      comms: [{ eyebrow: "Contact", title: "Get in touch." }, { eyebrow: "Contact", title: "Let's work together." }],
    },
  },
  noir: {
    label: "Noir",
    blurb: "Quiet luxury after dark: light serif display, champagne accents, slow reveals.",
    bestFor: "Senior leaders, founders, creative directors",
    heroLayout: "noir",
    greeting: "Good evening.",
    launchLabel: "Prologue",
    palettes: [["noir", 1]],
    accentHues: [[68, 92], [25, 45], [335, 355]],
    paperHues: [[50, 85]],
    defaultTheme: [["dark", 5], ["light", 1]],
    fonts: [["noir", 5], ["editorial", 1]],
    heroes: [["monogram", 3], ["flowfield", 2], ["contours", 1]],
    motions: [["cinematic", 3], ["calm", 3]],
    radii: [["sharp", 3], ["soft", 1]],
    textures: [["grain", 3], ["none", 2]],
    densities: [["airy", 1]],
    orders: [["story", 3], ["work-first", 2]],
    variants: {
      telemetry: [["strip", 4], ["dials", 1]],
      trajectory: [["ledger", 3], ["rail", 1]],
      payload: [["bars", 3], ["graph", 1]],
      missions: [["index", 3], ["cards", 2]],
    },
    codeStyle: "section",
    assistants: ["Concierge", "Curator", "Atelier"],
    kickers: ["A portfolio", "Collected work", "Private viewing"],
    ctas: ["Ask the {assistant}", "Speak with the {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "Highlights", title: "The work, in figures.", lede: "{kpiCount} results, each quoted from the record." },
        { eyebrow: "Highlights", title: "Measured, not claimed.", lede: "Every figure is quoted from the résumé." },
      ],
      trajectory: [
        { eyebrow: "Career", title: "A career, in chapters.", lede: "{roleCount} chapters, the latest first." },
        { eyebrow: "Career", title: "The story so far.", lede: "{roleCount} roles, most recent first." },
      ],
      payload: [
        { eyebrow: "Expertise", title: "Disciplines.", lede: "{skillCount} skills, grouped by craft." },
        { eyebrow: "Expertise", title: "Areas of mastery.", lede: "Grouped by craft, weighted by how often the work shows them." },
      ],
      missions: [
        { eyebrow: "Portfolio", title: "Selected pieces.", lede: "{projectCount} works. Open any one to read it in full." },
        { eyebrow: "Portfolio", title: "The collection.", lede: "{projectCount} pieces, each drawn from the record." },
      ],
      training: [
        { eyebrow: "Education & honours", title: "Credentials." },
        { eyebrow: "Background", title: "Formation." },
      ],
      comms: [{ eyebrow: "Contact", title: "An introduction, perhaps?" }, { eyebrow: "Contact", title: "Write to {first}." }],
    },
  },
  brutalist: {
    label: "Bold",
    blurb: "Brutalist poster energy: giant type, thick rules, hard shadows, one loud colour.",
    bestFor: "Creatives, marketers, growth, startups",
    heroLayout: "poster",
    greeting: "Hey!",
    launchLabel: "Hello",
    palettes: [["poster", 1]],
    accentHues: [[0, 30], [50, 105], [140, 160], [225, 290], [300, 340]],
    paperHues: [[70, 105], [150, 180], [0, 25], [270, 300]],
    defaultTheme: [["light", 5], ["dark", 1]],
    fonts: [["poster", 4], ["grotesk", 2], ["neo", 2]],
    heroes: [["monogram", 3], ["flowfield", 1], ["contours", 1]],
    motions: [["snappy", 5]],
    radii: [["sharp", 1]],
    textures: [["none", 2], ["grain", 1]],
    densities: [["compact", 3], ["airy", 1]],
    orders: [["work-first", 2], ["story", 2], ["skills-first", 1]],
    variants: {
      telemetry: [["dials", 3], ["strip", 2]],
      trajectory: [["ledger", 2], ["rail", 2]],
      payload: [["bars", 3], ["graph", 1]],
      missions: [["cards", 4], ["index", 1]],
    },
    codeStyle: "numeric",
    assistants: ["Hotline", "Front Desk", "Bot"],
    kickers: ["Portfolio. No fluff.", "Work. Results. Contact.", "Hello, world"],
    ctas: ["Ask the {assistant}", "Grill the {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "Numbers", title: "Results, not adjectives.", lede: "{kpiCount} numbers, straight from the résumé." },
        { eyebrow: "Numbers", title: "The receipts.", lede: "{kpiCount} results. Each one links to its source line." },
      ],
      trajectory: [
        { eyebrow: "Jobs", title: "Where the work got done.", lede: "{roleCount} roles, newest first." },
        { eyebrow: "Jobs", title: "The track record.", lede: "{roleCount} roles. Tap one for the details." },
      ],
      payload: [
        { eyebrow: "Stack", title: "The toolbox.", lede: "{skillCount} skills, and where each one was used." },
        { eyebrow: "Stack", title: "What's in the kit.", lede: "Grouped, counted, linked to real work." },
      ],
      missions: [
        { eyebrow: "Projects", title: "Things I built.", lede: "{projectCount} projects. Open one." },
        { eyebrow: "Projects", title: "Shipped.", lede: "{projectCount} projects, each traced to where it happened." },
      ],
      training: [
        { eyebrow: "School & wins", title: "Credentials." },
        { eyebrow: "School & wins", title: "Trophy shelf." },
      ],
      comms: [{ eyebrow: "Contact", title: "Say hi." }, { eyebrow: "Contact", title: "Let's talk." }],
    },
  },
  aurora: {
    label: "Aurora",
    blurb: "A modern product page: soft gradient light, glassy cards, rounded everything.",
    bestFor: "Product engineers, PMs, AI builders",
    heroLayout: "aurora",
    greeting: "Hey there!",
    launchLabel: "Home",
    palettes: [["pastel", 1]],
    accentHues: [[250, 300], [180, 215], [330, 360], [20, 45]],
    paperHues: [[250, 280]],
    defaultTheme: [["light", 3], ["dark", 2]],
    fonts: [["modern", 4], ["technical", 1], ["swiss", 1]],
    heroes: [["aurora", 1]],
    motions: [["snappy", 3], ["cinematic", 2]],
    radii: [["round", 1]],
    textures: [["none", 1]],
    densities: [["airy", 3], ["compact", 1]],
    orders: [["story", 3], ["work-first", 2]],
    variants: {
      telemetry: [["dials", 4], ["strip", 1]],
      trajectory: [["rail", 3], ["ledger", 2]],
      payload: [["graph", 2], ["bars", 2]],
      missions: [["cards", 4], ["index", 1]],
    },
    codeStyle: "numeric",
    assistants: ["Copilot", "Assistant", "Nova"],
    kickers: ["Portfolio", "Currently building", "Profile"],
    ctas: ["Ask my {assistant}", "Chat with my {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "Impact", title: "Shipped, measured, proven.", lede: "{kpiCount} outcomes, each quoted from the résumé." },
        { eyebrow: "Impact", title: "What changed because of the work.", lede: "{kpiCount} results with their sources." },
      ],
      trajectory: [
        { eyebrow: "Experience", title: "The journey so far.", lede: "{roleCount} roles, most recent first." },
        { eyebrow: "Experience", title: "Where I've shipped.", lede: "{roleCount} roles. Expand one for highlights." },
      ],
      payload: [
        { eyebrow: "Toolkit", title: "Built with.", lede: "{skillCount} skills, linked to where they were used." },
        { eyebrow: "Toolkit", title: "The stack.", lede: "Grouped by area, weighted by real use." },
      ],
      missions: [
        { eyebrow: "Projects", title: "Featured work.", lede: "{projectCount} projects. Open one to see how it was built." },
        { eyebrow: "Projects", title: "Things I've shipped.", lede: "{projectCount} projects, traced to their source." },
      ],
      training: [
        { eyebrow: "Education", title: "Foundations & recognition." },
        { eyebrow: "Education", title: "Learning & awards." },
      ],
      comms: [{ eyebrow: "Contact", title: "Let's build something." }, { eyebrow: "Contact", title: "Get in touch." }],
    },
  },
  scholar: {
    label: "Scholar",
    blurb: "An academic paper: book serif, numbered sections, every claim footnoted to its source.",
    bestFor: "Researchers, academics, PhD & grad applicants",
    heroLayout: "paper",
    greeting: "Hello.",
    launchLabel: "Abstract",
    palettes: [["paper", 3], ["gallery", 2]],
    accentHues: [[0, 25], [210, 250], [140, 165]],
    paperHues: [[70, 95]],
    defaultTheme: [["light", 5], ["dark", 1]],
    fonts: [["scholar", 5], ["editorial", 2]],
    heroes: [["contours", 3], ["constellation", 1]],
    motions: [["calm", 1]],
    radii: [["sharp", 1]],
    textures: [["none", 3], ["grain", 1]],
    densities: [["compact", 2], ["airy", 2]],
    orders: [["story", 3], ["skills-first", 1]],
    variants: {
      telemetry: [["strip", 4], ["dials", 1]],
      trajectory: [["ledger", 1]],
      payload: [["bars", 3], ["graph", 2]],
      missions: [["index", 4], ["cards", 1]],
    },
    codeStyle: "section",
    assistants: ["Reviewer", "Librarian", "Referee"],
    kickers: ["Curriculum vitae", "Research profile", "Working paper"],
    ctas: ["Ask the {assistant}", "Query the {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "Results", title: "Principal findings.", lede: "{kpiCount} results, each cited to its source." },
        { eyebrow: "Results", title: "Key results.", lede: "Figures are quoted verbatim; sources follow each." },
      ],
      trajectory: [
        { eyebrow: "Appointments", title: "Positions held.", lede: "{roleCount} positions, most recent first." },
        { eyebrow: "Appointments", title: "Research and industry positions.", lede: "{roleCount} entries, reverse chronological." },
      ],
      payload: [
        { eyebrow: "Methods", title: "Methods and tools.", lede: "{skillCount} methods, with the work that used each." },
        { eyebrow: "Methods", title: "Methodology.", lede: "Grouped by field; weighted by citations in the record." },
      ],
      missions: [
        { eyebrow: "Projects", title: "Selected work.", lede: "{projectCount} projects, each referenced to its source." },
        { eyebrow: "Projects", title: "Research and projects.", lede: "{projectCount} entries. Open one for the full abstract." },
      ],
      training: [
        { eyebrow: "Education", title: "Education and distinctions." },
        { eyebrow: "Education", title: "Training and honours." },
      ],
      comms: [{ eyebrow: "Correspondence", title: "Correspondence." }, { eyebrow: "Contact", title: "Write to {first}." }],
    },
  },
  blueprint: {
    label: "Blueprint",
    blurb: "An engineering drawing: blueprint blue, white linework, every detail dimensioned.",
    bestFor: "Hardware, civil, mechanical, systems engineers",
    heroLayout: "mission",
    greeting: "Drawing set loaded.",
    launchLabel: "Title",
    palettes: [["blueprint", 1]],
    accentHues: [[45, 95], [170, 200], [5, 25]],
    paperHues: [[235, 255]],
    defaultTheme: [["dark", 4], ["light", 2]],
    fonts: [["blueprint", 4], ["technical", 2], ["terminal", 1]],
    heroes: [["contours", 3], ["constellation", 3]],
    motions: [["snappy", 3], ["cinematic", 2]],
    radii: [["sharp", 1]],
    textures: [["grid", 1]],
    densities: [["compact", 2], ["airy", 2]],
    orders: [["story", 2], ["skills-first", 2], ["work-first", 1]],
    variants: {
      telemetry: [["dials", 3], ["strip", 2]],
      trajectory: [["rail", 3], ["ledger", 2]],
      payload: [["graph", 4], ["bars", 1]],
      missions: [["cards", 3], ["index", 2]],
    },
    codeStyle: "numeric",
    assistants: ["Draftsman", "Engineer", "Spec"],
    kickers: ["Drawing set", "Rev. A, as built", "Spec sheet"],
    ctas: ["Ask the {assistant}", "Query the {assistant}"],
    copy: {
      telemetry: [
        { eyebrow: "Specs", title: "Measured tolerances.", lede: "{kpiCount} figures, each taken from the record." },
        { eyebrow: "Specs", title: "Performance data.", lede: "{kpiCount} measured results, with their source lines." },
      ],
      trajectory: [
        { eyebrow: "Revisions", title: "Revision history.", lede: "{roleCount} roles, latest revision first." },
        { eyebrow: "Revisions", title: "As-built record.", lede: "{roleCount} roles. Open one for its detail sheet." },
      ],
      payload: [
        { eyebrow: "Components", title: "Bill of materials.", lede: "{skillCount} parts, each traced to where it was used." },
        { eyebrow: "Components", title: "Parts list.", lede: "Grouped by subsystem; links only where a line uses the part." },
      ],
      missions: [
        { eyebrow: "Assemblies", title: "Built assemblies.", lede: "{projectCount} assemblies. Open one for the detail drawing." },
        { eyebrow: "Assemblies", title: "Projects, as built.", lede: "{projectCount} projects, each traced to its source." },
      ],
      training: [
        { eyebrow: "Foundations", title: "Foundations." },
        { eyebrow: "Foundations", title: "Certified and qualified." },
      ],
      comms: [{ eyebrow: "Contact", title: "Get in touch." }, { eyebrow: "Contact", title: "Open a request." }],
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
  const leader = count(["director", "head of", "vice president", "vp ", "founder", "co-founder", "chief", "principal", "partner", "lead "]);
  const growth = count(["marketing", "growth", "startup", "brand", "social media", "campaign", "creator", "sales"]);
  const product = count(["product", "saas", "frontend", "react", "typescript", "startup", "app ", "mobile", "ux", "ai "]);
  const academic = count(["phd", "ph.d", "research", "publication", "thesis", "journal", "professor", "laboratory", "paper", "conference", "postdoc"]);
  const hardware = count(["civil", "mechanical", "electrical", "hardware", "cad", "autocad", "solidworks", "structural", "robot", "matlab", "simulink", "embedded", "pcb"]);
  return {
    mission: 1 + tech * 1.2,
    terminal: 0.6 + hacker * 1.5 + tech * 0.5,
    editorial: 1 + creative * 1.4,
    minimal: 1.4 + (tech + creative) * 0.3,
    noir: 0.4 + leader * 1.4,
    brutalist: 0.4 + growth * 1.2 + creative * 0.3,
    aurora: 0.8 + product * 0.8,
    scholar: 0.3 + academic * 1.2,
    blueprint: 0.4 + hardware * 1.3,
  };
}
