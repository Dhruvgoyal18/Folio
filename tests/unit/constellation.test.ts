import { describe, expect, it } from "vitest";
import { buildConstellation, nodeProgress, mulberry32 } from "@/lib/constellation";
import { seedResume as resume } from "@/data/seed";
import { runCommand } from "@/components/easter/EasterEggs";

describe("constellation layout", () => {
  const L = buildConstellation(resume, { halfWidth: 5 });
  it("has one star per skill and is deterministic", () => {
    expect(L.nodes).toHaveLength(resume.skills.length);
    expect(buildConstellation(resume, { halfWidth: 5 })).toEqual(L);
    expect(mulberry32(1)()).toBe(mulberry32(1)());
  });
  it("orders evidenced skills on the line by first use", () => {
    const ev = L.nodes.filter((n) => n.evidenced).sort((a, b) => a.end[0] - b.end[0]);
    const dates = ev.map((n) => n.firstUsed!);
    expect([...dates].sort()).toEqual(dates);
    const lang = L.nodes.find((n) => n.id === "langgraph")!;
    const roberta = L.nodes.find((n) => n.id === "roberta")!;
    expect(lang.end[0]).toBeGreaterThan(roberta.end[0]);
  });
  it("keeps toolkit skills left of the timeline and inside bounds", () => {
    const minEvidenced = Math.min(...L.nodes.filter((n) => n.evidenced).map((n) => n.end[0]));
    for (const n of L.nodes.filter((x) => !x.evidenced)) expect(n.end[0]).toBeLessThan(minEvidenced);
    for (const n of L.nodes) expect(Math.abs(n.end[0])).toBeLessThanOrEqual(5.0001);
  });
  it("ticks cover the years with evidence", () => {
    expect(L.ticks.filter((t) => t.kind === "year").map((t) => t.label)).toEqual(["2024", "2025", "2026"]);
  });
  it("progress easing is clamped and monotonic", () => {
    expect(nodeProgress(0, 0, 10)).toBe(0);
    expect(nodeProgress(1, 9, 10)).toBe(1);
    let prev = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const v = nodeProgress(p, 5, 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("terminal easter egg", () => {
  it("answers whoami and cat from resume data", () => {
    expect(runCommand(resume, "whoami").out).toContain("Dhruv Goyal");
    expect(runCommand(resume, "cat zolve").out).toContain("LangGraph");
    expect(runCommand(resume, "ls missions").out).toContain("QUERY-87");
    expect(runCommand(resume, "nonsense").out).toMatch(/command not found/);
    expect(runCommand(resume, "sudo hire dhruv").action).toBeTypeOf("function");
  });
});

import { computeSkillGraph } from "@/lib/skill-graph";
describe("skills graph", () => {
  it("layout is deterministic (published sites store it; the server recomputes it on publish)", () => {
    expect(computeSkillGraph(resume)).toEqual(computeSkillGraph(resume));
  });
  it("only links skills to roles whose bullets name them", () => {
    const g = computeSkillGraph(resume);
    expect(g.links).toContainEqual(["kafka", "exp-zolve"]);
    expect(g.links.find(([s]) => s === "python")).toBeUndefined();
  });
});
