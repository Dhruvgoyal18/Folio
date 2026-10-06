import { describe, expect, it } from "vitest";
import raw from "@/data/resume.json";
import { ResumeSchema } from "@/data/schema";
import {
  allHighlights, kpis, skillUsage, skillEdges, domainEvidence, citeTargets,
  projectsWithHighlights, formatMetric, experienceChronological, dateRange,
} from "@/lib/resume";
import { seedResume as resume } from "@/data/seed";

const clone = () => JSON.parse(JSON.stringify(raw));

describe("resume.json against ResumeSchema", () => {
  it("parses", () => {
    expect(ResumeSchema.safeParse(raw).success).toBe(true);
  });
  it("resume.parsed.json is up to date (run `npm run validate`)", () => {
    expect(resume).toEqual(ResumeSchema.parse(raw));
  });
  it("rejects unknown skill references", () => {
    const bad = clone();
    bad.experience[0].groups[0].highlights[0].skills = ["not-a-skill"];
    const res = ResumeSchema.safeParse(bad);
    expect(res.success).toBe(false);
    expect(JSON.stringify(res.error?.issues)).toContain("unknown skill not-a-skill");
  });
  it("rejects duplicate ids", () => {
    const bad = clone();
    bad.awards[1].id = bad.awards[0].id;
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects malformed dates and end-before-start", () => {
    const bad = clone();
    bad.experience[0].start = "May 2024";
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
    const bad2 = clone();
    bad2.experience[0].end = "2020-01";
    expect(ResumeSchema.safeParse(bad2).success).toBe(false);
  });
  it("rejects projects that point at missing highlights", () => {
    const bad = clone();
    bad.projects[0].highlightIds.push("h-missing");
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });
});

describe("facts match the source PDF", () => {
  it("has the four roles with resume dates", () => {
    const ids = experienceChronological(resume).map((e) => [e.id, e.start, e.end]);
    expect(ids).toEqual([
      ["exp-titan", "2024-05", "2024-06"],
      ["exp-iitkgp-ai", "2024-08", "2024-12"],
      ["exp-zolve", "2025-09", null],
      ["exp-nus", "2026-06", "2026-07"],
    ]);
    expect(dateRange("2025-09", null)).toBe("Sep 2025 – Present");
  });
  it("lists all 31 unique skills from the Skills section (ROS listed twice in the PDF)", () => {
    expect(resume.skills.filter((s) => s.listed)).toHaveLength(31);
  });
  it("keeps the original wording of the softened bullet", () => {
    const h = allHighlights(resume).find((x) => x.id === "h-zolve-reddit")!;
    expect(h.original).toContain("persona-segmented");
    expect(h.text).not.toContain("persona");
  });
  it("every bullet with a number exposes it as a metric or plain text", () => {
    for (const h of allHighlights(resume)) {
      for (const m of h.metrics) expect(h.text).toContain(String(m.value).replace(/\.0+$/, ""));
    }
  });
});

describe("derived views", () => {
  it("produces six telemetry KPIs, each traceable to a bullet", () => {
    const k = kpis(resume);
    // ordered by kpiRank: a change, a share, a reduction, a lift, then the counts
    expect(k.map((m) => formatMetric(m))).toEqual(["87%", "95%+", "99.93%", "+65%", "20+", "400k+"]);
    expect(k.map((m) => m.kind)).toEqual(["change", "share", "reduction", "lift", "count", "count"]);
    expect(k[0]!.context).toBe("Text-to-SQL Copilot");
    for (const x of k) expect(x.sourceText.length).toBeGreaterThan(20);
    expect(k[0]!.from).toBe(68);
  });
  it("skill usage only links skills that a bullet names", () => {
    const u = skillUsage(resume);
    const langgraph = u.find((x) => x.skill.id === "langgraph")!;
    expect(langgraph.ownerIds).toEqual(["exp-zolve"]);
    expect(langgraph.projectIds).toEqual(["proj-agent-platform"]);
    expect(langgraph.firstUsed).toBe("2025-09");
    const librosa = u.find((x) => x.skill.id === "librosa")!;
    expect(librosa.ownerIds).toEqual([]);
    expect(librosa.firstUsed).toBeNull();
  });
  it("edges connect co-occurring skills", () => {
    const e = skillEdges(resume).map((p) => p.join("|"));
    expect(e).toContain("presto-trino|rag");
    expect(e).toContain("ada-002|faiss");
  });
  it("domain evidence counts bullets", () => {
    const d = domainEvidence(resume);
    expect(d.find((x) => x.domain === "genai")!.bullets).toBeGreaterThan(3);
    expect(d.reduce((a, b) => a + b.skills, 0)).toBe(resume.skills.length);
  });
  it("cite targets are unique", () => {
    const ids = citeTargets(resume).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("projects resolve their highlights and skills", () => {
    const p = projectsWithHighlights(resume);
    expect(p).toHaveLength(8);
    expect(p.find((x) => x.id === "proj-dapi")!.skills).toEqual(["cnn", "modal", "hugging-face", "openseadragon"]);
  });
});
