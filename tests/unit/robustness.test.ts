import { describe, it, expect } from "vitest";
import { CORPUS } from "../fixtures/resumes";
import { parseResumeText } from "@/extract/heuristic";
import { normalize } from "@/extract/normalize";
import { DraftSchema, type Draft } from "@/extract/draft";
import { tidy, tryNormalize } from "@/create/model";
import { ResumeSchema } from "@/data/schema";
import { generateGenome } from "@/genome/generate";
import { validateGenome } from "@/genome/validate";
import { computeSkillGraph } from "@/lib/skill-graph";
import { buildModel } from "@/site/model";
import { mulberry32 } from "@/lib/constellation";

/** The whole pipeline a visitor's upload goes through, from text to a renderable site model. */
function pipeline(text: string, seed = 1) {
  const { draft, unplaced } = parseResumeText(text);
  const reviewed = DraftSchema.parse(tidy(draft)); // what the studio sends on publish
  const { resume, notes } = normalize(reviewed);
  expect(ResumeSchema.safeParse(resume).success).toBe(true);
  const genome = generateGenome(resume, { seed });
  expect(validateGenome(genome).ok).toBe(true);
  const graph = computeSkillGraph(resume);
  const model = buildModel({ slug: "t", resume, genome, graph });
  return { draft, unplaced, resume, notes, model };
}

describe("every résumé layout in the corpus builds a valid site", () => {
  for (const [name, text] of Object.entries(CORPUS)) {
    it(name, () => {
      for (const seed of [1, 2, 3]) pipeline(text, seed);
    });
  }
});

describe("the upload that used to fail (positions of responsibility + coursework)", () => {
  const r = pipeline(CORPUS.dhruvPor!);
  it("produces only kebab-case ids, even for long titles", () => {
    const ids = [...r.resume.projects.map((p) => p.id), ...r.resume.projects.flatMap((p) => p.highlights.map((h) => h.id)), ...r.resume.experience.map((e) => e.id)];
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(r.resume.projects.length).toBe(3);
  });
  it("turns positions of responsibility into a Leadership role", () => {
    const por = r.resume.experience.find((e) => /General Secretary/.test(e.role))!;
    expect(por).toBeDefined();
    expect(por.org).toBe("Rajendra Prasad Hall of Residence");
    expect(por.location).toBe("IIT Kharagpur");
    expect(por.type).toBe("Leadership");
    expect(por.start).toBe("2024-07");
    expect(por.end).toBe("2025-04");
    expect(por.groups.flatMap((g) => g.highlights)).toHaveLength(3);
  });
  it("puts the coursework section on the degree", () => {
    const cw = r.resume.education[0]!.coursework;
    expect(cw).toEqual(expect.arrayContaining(["Probability and Statistics", "Basic Electronics", "Linear Algebra, Numerical and Complex Analysis", "Programming and Data Structures (theory and lab)", "Data Science Mentorship Program"]));
  });
  it("leaves nothing unplaced", () => {
    expect(r.unplaced).toEqual([]);
  });
});

describe("other layouts are read sensibly", () => {
  it("title-case headings, 'Role at Org' and 'Role, Org'", () => {
    const { resume } = pipeline(CORPUS.designerTitleCase!);
    expect(resume.experience.map((e) => [e.role, e.org])).toEqual([
      ["Senior Product Designer", "Lumen Health"],
      ["Product Designer", "Northbeam Bank"],
    ]);
    expect(resume.experience[1]!.start).toBe("2019-06");
  });
  it("unbulleted sentences, 'Org – City' then 'Role ⇥ dates', and volunteering", () => {
    const { resume } = pipeline(CORPUS.nurseNoBullets!);
    const charge = resume.experience.find((e) => e.role === "Charge Nurse")!;
    expect(charge.org).toBe("St. Mary's Hospital");
    expect(charge.groups.flatMap((g) => g.highlights)).toHaveLength(2);
    expect(resume.experience.find((e) => e.type === "Volunteer" || e.type === "Leadership")).toBeDefined();
  });
  it("pipe-separated role | org | place with bracketed dates", () => {
    const { resume } = pipeline(CORPUS.dateFormats!);
    expect(resume.experience[0]).toMatchObject({ role: "Data Scientist", org: "Acme Analytics", location: "Nairobi", start: "2023-09", end: null });
    expect(resume.experience[1]).toMatchObject({ role: "Analyst", org: "Beta Bank", start: "2020-01", end: "2023-08" });
  });
  it("markdown, ALL-CAPS names with credentials, emoji, two-column headings and YYYY.MM dates", () => {
    const md = pipeline(CORPUS.markdown!).resume;
    expect(md.profile.name).toBe("Sam Rivera");
    expect(md.experience[0]).toMatchObject({ role: "Platform Engineer", org: "Stripe-like Payments Co." });
    expect(md.education[0]).toMatchObject({ institution: "University of Toronto", degree: "BSc Computer Science" });
    expect(pipeline(CORPUS.nurseNoBullets!).resume.profile.name).toBe("Jordan Blake");
    expect(pipeline(CORPUS.unicodeAndEmoji!).resume.profile.name).toBe("Zoë Ångström");
    const two = pipeline(CORPUS.twoColumnMess!).resume;
    expect(two.profile.name).toBe("Lee Min-Jun");
    expect(two.experience[0]).toMatchObject({ role: "Backend Engineer", start: "2019-03", end: "2023-08" });
  });
  it("splits 'Institution — Degree, Year' education lines", () => {
    expect(pipeline(CORPUS.designerTitleCase!).resume.education[0]).toMatchObject({ institution: "California College of the Arts", degree: "BFA Interaction Design" });
    expect(pipeline(CORPUS.publicationsAcademic!).resume.education[0]).toMatchObject({ institution: "University of Tokyo", degree: "Ph.D. Biology", end: "2022-01" });
    expect(pipeline(CORPUS.nurseNoBullets!).resume.education[0]).toMatchObject({ institution: "Northeastern University", degree: "Bachelor of Science in Nursing" });
  });
  it("single dates and seasons ('Intern, Gamma Labs ⇥ Summer 2019')", () => {
    expect(pipeline(CORPUS.dateFormats!).resume.experience[2]).toMatchObject({ role: "Intern", org: "Gamma Labs", type: "Internship", start: "2019-01" });
  });
  it("junk-only input gives a valid site and reports what it couldn't place", () => {
    const r = pipeline(CORPUS.bulletsOnlyWeird!);
    expect(r.resume.profile.name).toBe("Robin");
    expect(r.unplaced.length).toBeGreaterThan(0);
  });
  it("dated 'Role | Org [ Jun'24 ]' entries filed under Projects become roles; long project titles keep valid ids", () => {
    const r = pipeline(CORPUS.internshipsUnderProjects!).resume;
    expect(r.experience.map((e) => [e.role, e.org, e.start, e.end])).toEqual([
      ["Data Analyst Intern", "Hotel Chain Pvt Ltd", "2024-05", "2024-07"],
      ["Machine Learning Intern", "Medifio", "2024-06", "2024-06"],
      ["Data Science Intern", "Heltar", "2023-12", "2024-02"],
    ]);
    expect(r.experience[1]!.location).toBe("BioNEST IIT Guwahati");
    const proj = r.projects.find((p) => p.title.startsWith("Procurement"))!;
    expect(proj.highlights).toHaveLength(4);
    for (const h of proj.highlights) expect(h.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
  it("a résumé with no sections still becomes a (small) site", () => {
    const { resume, model } = pipeline(CORPUS.noHeadings!);
    expect(resume.profile.name).toBe("Alex Morgan");
    expect(model.chapters.length).toBeGreaterThan(0);
  });
});

/* ---------- fuzzing: shuffled, truncated and corrupted inputs must never throw ---------- */

const ALL_LINES = Object.values(CORPUS).flatMap((t) => t.split("\n"));
const JUNK = ["", "•", "|", "—", "2020 – 2019", "Present – Jan 2020", "....", "::", "EXPERIENCE", "SKILLS", "Education", "• ", "[Jul '24 - ]", "@@@", "😀😀", "https://", "http://x", "a".repeat(400), "Ⅻ", "\t\t", "() []", "Role | | |"];

describe("fuzz: random résumé text", () => {
  it("survives 1500 random documents", () => {
    const rand = mulberry32(42);
    const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]!;
    for (let n = 0; n < 1500; n++) {
      const lines: string[] = [pick(["Ann Lee", "X", "", "李明", "O'Brien-Smith, Jr."])];
      const len = 3 + Math.floor(rand() * 45);
      for (let i = 0; i < len; i++) {
        let l = rand() < 0.15 ? pick(JUNK) : pick(ALL_LINES);
        if (rand() < 0.1) l = l.slice(0, Math.floor(rand() * l.length));
        if (rand() < 0.05) l = l.toUpperCase();
        lines.push(l);
      }
      const text = lines.join("\n");
      try {
        const { draft } = parseResumeText(text);
        const { resume } = normalize(DraftSchema.parse(tidy(draft)));
        expect(ResumeSchema.safeParse(resume).success).toBe(true);
        buildModel({ slug: "f", resume, genome: generateGenome(resume, { seed: n }), graph: computeSkillGraph(resume) });
      } catch (e) {
        throw new Error(`fuzz case ${n} failed: ${(e as Error).message}\n---\n${text}`);
      }
    }
  }, 30_000); // 1500 full pipelines (parse → normalise → genome → model); slow on a busy CI worker
});

describe("fuzz: hand-edited drafts from the review screen", () => {
  const STR = ["", " ", "x", "Engineer", "ACME", "Sept 2025", "Present", "2019", "13/2020", "someday", "2030-01", "–", "©®™", "<script>alert(1)</script>", "$& $1", "a".repeat(300), "Q3 2021", "Jan '24", "1999 – 2001"];
  it("survives 1500 random drafts", () => {
    const rand = mulberry32(7);
    const s = () => STR[Math.floor(rand() * STR.length)]!;
    const many = <T,>(f: () => T, max = 4) => Array.from({ length: Math.floor(rand() * (max + 1)) }, f);
    for (let n = 0; n < 1500; n++) {
      const raw = {
        name: s() || "N",
        headline: s(),
        summary: s(),
        email: rand() < 0.5 ? "a@b.co" : s(),
        phone: s(),
        location: s(),
        links: many(() => ({ url: rand() < 0.5 ? "github.com/x" : s() || "y" })),
        experience: many(() => ({ org: s(), role: s(), type: s(), location: s(), start: s(), end: s(), groups: many(() => ({ title: s(), bullets: many(s, 5) }), 3) }), 5),
        education: many(() => ({ institution: s(), degree: s(), start: s(), end: s(), coursework: many(s) })),
        skills: many(() => ({ group: s(), items: many(s, 8) })),
        projects: many(() => ({ title: s(), link: s(), bullets: many(s) })),
        competitions: many(() => ({ name: s(), result: s(), start: s(), end: s(), bullets: many(s) })),
        awards: many(() => ({ text: s() || "A" })),
      } as unknown as Draft;
      try {
        const r = tryNormalize(tidy(raw));
        if (!tidy(raw).name) expect(r).toEqual({ ok: false, error: "Add your full name to continue." });
        else {
          if (!r.ok) throw new Error(r.error);
          expect(ResumeSchema.safeParse(r.resume).success).toBe(true);
        }
      } catch (e) {
        throw new Error(`draft case ${n} failed: ${(e as Error).message}\n${JSON.stringify(raw).slice(0, 1500)}`);
      }
    }
  }, 30_000); // 1500 full pipelines (parse → normalise → genome → model); slow on a busy CI worker
});

import { dateRange } from "@/lib/resume";
describe("year-only dates", () => {
  it("are shown as years, never as invented months", () => {
    const r = pipeline(CORPUS.studentMinimal!).resume;
    const edu = r.education[0]!;
    expect(edu.yearOnly).toBe(true);
    expect(dateRange(edu.start, edu.end, edu.yearOnly)).toBe("2010 – 2022");
    const m = pipeline(CORPUS.designerTitleCase!).resume;
    expect(m.experience[0]!.yearOnly).toBeUndefined();
    expect(dateRange(m.experience[0]!.start, m.experience[0]!.end, m.experience[0]!.yearOnly)).toBe("Mar 2022 – Present");
  });
});
