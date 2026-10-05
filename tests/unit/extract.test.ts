import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdfDocToText, type PdfDoc } from "@/extract/pdf";
import { parseResumeText } from "@/extract/heuristic";
import { normalize } from "@/extract/normalize";
import { findMetrics } from "@/extract/metrics";
import { mentions, classifySkill, skillsInText } from "@/extract/skills";
import { parseDate, findRange } from "@/extract/dates";
import type { Resume } from "@/data/schema";

let text = "";
let links: string[] = [];
let resume: Resume;
let draft: ReturnType<typeof parseResumeText>["draft"];

beforeAll(async () => {
  const data = new Uint8Array(readFileSync("tests/fixtures/dhruv.pdf"));
  const doc = (await getDocument({ data, useSystemFonts: true }).promise) as unknown as PdfDoc;
  ({ text, links } = await pdfDocToText(doc));
  draft = parseResumeText(text, links).draft;
  resume = normalize(draft, "dhruv.pdf").resume;
});

describe("dates", () => {
  it("parses common formats", () => {
    expect(parseDate("Sept 2025")).toBe("2025-09");
    expect(parseDate("July 2026")).toBe("2026-07");
    expect(parseDate("05/2021")).toBe("2021-05");
    expect(parseDate("2019")).toBe("2019-01");
    expect(parseDate("Present")).toBeNull();
    expect(parseDate("someday")).toBeUndefined();
    expect(findRange("Acme Inc\tJan 2020 - Present")).toMatchObject({ start: "Jan 2020", end: "Present" });
  });
});

describe("metrics", () => {
  it("finds from→to, %, magnitudes, multiples and money without years", () => {
    const m = findMetrics("improving SQL accuracy from 68% to 87% over 5K+ query logs in 2024");
    expect(m.find((x) => x.value === 87)).toMatchObject({ from: 68, suffix: "%" });
    expect(m.find((x) => x.value === 5)).toMatchObject({ suffix: "K+" });
    expect(m.some((x) => x.value === 2024)).toBe(false);
    expect(findMetrics("made it 3x faster")[0]).toMatchObject({ value: 3, suffix: "×" });
    expect(findMetrics("saved $1.2M in cloud spend")[0]).toMatchObject({ value: 1.2, prefix: "$", suffix: "M" });
  });
  it("every metric value appears in the text", () => {
    const s = "lifting F1 by 27% and 99.93% reduction in peak memory, aggregating 400k+ leads";
    for (const m of findMetrics(s)) expect(s).toContain(String(m.value));
  });
});

describe("skills", () => {
  it("matches whole words, case-aware for short names", () => {
    expect(mentions("Built with C and Python", "C")).toBe(true);
    expect(mentions("Talked to the C-suite", "C")).toBe(false);
    expect(mentions("R&D budget", "R")).toBe(false);
    expect(mentions("Ran it on Kubernetes", "K8s")).toBe(true);
    expect(classifySkill("numpy")?.name).toBe("NumPy");
    expect(skillsInText("LangGraph-based agents on Presto/Trino").map((s) => s.name)).toEqual(expect.arrayContaining(["LangGraph", "Presto"]));
  });
});

describe("PDF → heuristic draft (Dhruv fixture)", () => {
  it("reads text and link annotations", () => {
    expect(text).toContain("Zolve Innovations Private Limited");
    expect(links.some((l) => /linkedin\.com/i.test(l))).toBe(true);
    expect(links.some((l) => /github\.com/i.test(l))).toBe(true);
  });
  it("parses the header", () => {
    expect(draft.name).toBe("Dhruv Goyal");
    expect(draft.email).toBe("dhruvgoyal990@gmail.com");
    expect(draft.phone?.replace(/\s/g, "")).toBe("+919664134435");
  });
  it("parses four roles with orgs, roles, dates and groups", () => {
    expect(draft.experience).toHaveLength(4);
    const [z, nus, iit, titan] = draft.experience;
    expect(z).toMatchObject({ org: "Zolve Innovations Private Limited", role: "AI Engineer", start: "Sept 2025", end: "Present" });
    expect(z!.type?.toLowerCase()).toBe("full-time");
    expect(z!.groups.map((g) => g.title)).toEqual(["Multi-Agent Infrastructure & Enterprise AI Systems", "AI-Powered User Acquisition Systems"]);
    expect(z!.groups[0]!.bullets).toHaveLength(5);
    expect(z!.groups[1]!.bullets).toHaveLength(2);
    expect(nus).toMatchObject({ org: "Artificial Intelligence Institute, National University of Singapore", role: "AI Engineer" });
    expect(nus!.groups.flatMap((g) => g.bullets)).toHaveLength(3);
    expect(iit).toMatchObject({ role: "Research Intern" });
    expect(iit!.groups.flatMap((g) => g.bullets)).toHaveLength(4);
    expect(titan).toMatchObject({ org: "Titan Company Limited", role: "Data Analyst" });
    // wrapped / long bullets are kept whole
    expect(z!.groups[0]!.bullets[0]).toMatch(/from 68% to 87%$/);
  });
  it("parses education, skills, competitions and awards", () => {
    expect(draft.education[0]).toMatchObject({ institution: "Indian Institute of Technology, Kharagpur", degree: "B.Tech in Civil Engineering" });
    expect(draft.education[0]!.coursework).toContain("Machine Learning");
    const libs = draft.skills.find((g) => /Libraries/.test(g.group ?? ""));
    expect(libs?.items).toEqual(expect.arrayContaining(["Numpy", "Librosa", "OpenCV", "Pinecone"]));
    expect(draft.competitions).toHaveLength(2);
    expect(draft.competitions[0]).toMatchObject({ name: "Trumio.AI Event – Inter IIT Tech 12.0", result: "Gold Medal" });
    expect(draft.competitions[0]!.bullets).toHaveLength(3);
    expect(draft.awards).toHaveLength(3);
  });
});

describe("normalize", () => {
  it("produces a valid Resume with evidence, KPIs and derived case files", () => {
    expect(resume.profile.name).toBe("Dhruv Goyal");
    expect(resume.experience[0]!.start).toBe("2025-09");
    expect(resume.experience[0]!.end).toBeNull();
    const all = [...resume.experience.flatMap((e) => e.groups.flatMap((g) => g.highlights)), ...resume.competitions.flatMap((c) => c.highlights)];
    const metrics = all.flatMap((h) => h.metrics.map((m) => ({ h, m })));
    expect(metrics.filter(({ m }) => m.kpi).length).toBeGreaterThanOrEqual(3);
    expect(metrics.some(({ m }) => m.value === 87 && m.from === 68)).toBe(true);
    // every metric number is literally in its bullet
    for (const { h, m } of metrics) expect(h.text).toContain(String(m.value));
    // listed skills link to bullets that really mention them
    const lc = resume.skills.find((s) => s.name === "LangChain");
    const lcHits = all.filter((h) => h.skills.includes(lc!.id));
    expect(lcHits.length).toBeGreaterThan(0);
    for (const h of lcHits) expect(h.text).toMatch(/LangChain/);
    // coursework is not a skill
    expect(resume.skills.some((s) => s.name === "Machine Learning")).toBe(false);
    expect(resume.projects.length).toBeGreaterThan(0);
    expect(resume.profile.links.some((l) => l.kind === "github")).toBe(true);
    expect(resume.profile.links.some((l) => l.kind === "linkedin")).toBe(true);
  });
  it("copes with a minimal, unstructured resume", () => {
    const { draft: d } = parseResumeText("Jane Doe\njane@example.com\n\nExperience\nDesigner at Acme Studio\t2019 – Present\n- Led the rebrand for 40+ clients\n\nSkills\nFigma, Illustrator, Typography");
    const { resume: r } = normalize(d);
    expect(r.profile.name).toBe("Jane Doe");
    expect(r.experience[0]).toMatchObject({ org: "Acme Studio", role: "Designer" });
    expect(r.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["Figma", "Typography"]));
  });
});

describe("metric labels", () => {
  it("signs reductions and keeps labels to the noun phrase", () => {
    const [m] = findMetrics("Prototyped card controls in Framer, reducing support tickets about lost cards by 18%");
    expect(m).toMatchObject({ value: 18, prefix: "−", suffix: "%" });
    expect(m!.label).toBe("lost cards");
    expect(findMetrics("lifting F1 by 27%")[0]).toMatchObject({ prefix: "+", label: "F1" });
  });
});


describe("PDF with positions of responsibility and a coursework section", () => {
  it("places every line and builds a valid résumé", async () => {
    const data = new Uint8Array(readFileSync("tests/fixtures/por-coursework.pdf"));
    const doc = (await getDocument({ data, useSystemFonts: true }).promise) as unknown as PdfDoc;
    const { text, links } = await pdfDocToText(doc);
    const { draft, unplaced } = parseResumeText(text, links);
    expect(unplaced).toEqual([]);
    const { resume } = normalize(draft);
    const por = resume.experience.find((e) => e.type === "Leadership")!;
    expect(por).toMatchObject({ role: "General Secretary Maintenance", org: "Rajendra Prasad Hall of Residence", start: "2024-07", end: "2025-04" });
    expect(resume.education[0]!.coursework.length).toBeGreaterThan(8);
    expect(resume.profile.currentRole).toBe("AI Engineer at Zolve");
  });
});
