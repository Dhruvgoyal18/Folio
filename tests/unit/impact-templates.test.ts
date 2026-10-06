import { describe, expect, it } from "vitest";
import { seedResume } from "@/data/seed";
import { findMetrics } from "@/extract/metrics";
import { credentials, kpis, metricKind, reductionRatio, sentenceCase } from "@/lib/resume";
import { CONCEPT_DEFS, conceptAffinity } from "@/genome/concepts";
import { CONCEPTS, GenomeSchema, HEROES } from "@/genome/schema";
import { PAIRINGS } from "@/genome/fonts";
import { auditPalette } from "@/genome/palette";
import { TEMPLATES, TEMPLATE_SEEDS, templateGenome, templateSwatches } from "@/genome/templates";
import { generateGenome } from "@/genome/generate";
import { initials } from "@/components/visuals/Monogram";

describe("metric kinds (how a number is drawn)", () => {
  const kind = (text: string) => findMetrics(text).map((m) => metricKind(m, text));
  it("classifies the common résumé shapes", () => {
    expect(kind("improving SQL accuracy from 68% to 87%")).toEqual(["change"]);
    expect(kind("achieving 95%+ workflow reliability")).toEqual(["share"]);
    expect(kind("99.93% reduction in peak memory")).toEqual(["reduction"]);
    expect(kind("reduced latency by 40%")).toEqual(["reduction"]);
    expect(kind("lifting F1 by 27%")).toEqual(["lift"]);
    expect(kind("aggregating 400k+ potential leads")).toEqual(["count"]);
    expect(kind("saved $1.2M in annual spend")).toEqual(["money"]);
    expect(kind("made the build 3x faster")).toEqual(["multiple"]);
  });
  it("accuracy that improves 'by' is a lift, not a reduction", () => {
    expect(kind("cut review time and improved accuracy by 12%")).toEqual(["lift"]);
  });
  it("an explicit kind always wins", () => {
    expect(metricKind({ kind: "share", prefix: "+", suffix: "%", label: "x" })).toBe("share");
  });
  it("reduction ratios are honest arithmetic, shown only when clearer", () => {
    expect(reductionRatio(99.93)).toBe("≈1,400×");
    expect(reductionRatio(90)).toBe("≈10×");
    expect(reductionRatio(80)).toBe("≈5×");
    expect(reductionRatio(40)).toBeNull();
    expect(reductionRatio(100)).toBeNull();
  });
  it("labels are sentence-cased for display", () => {
    expect(sentenceCase("peak memory reduction")).toBe("Peak memory reduction");
    expect(sentenceCase("")).toBe("");
  });
});

describe("showcase content", () => {
  it("every KPI has a kind, a context and a value printed in its bullet", () => {
    for (const k of kpis(seedResume)) {
      expect(k.context.length).toBeGreaterThan(3);
      expect(k.sourceText).toContain(String(k.value).replace(/\.0$/, ""));
    }
  });
  it("hero credentials come from the record", () => {
    expect(credentials(seedResume)).toEqual(["IIT Kharagpur", "Gold Medal, Inter IIT 12.0", "Silver Medal · Product Development"]);
  });
  it("no skill domain is left nearly empty", () => {
    const used = seedResume.domains.map((d) => seedResume.skills.filter((s) => s.domain === d.id).length);
    expect(Math.min(...used)).toBeGreaterThanOrEqual(2);
  });
  it("the derived summary is flagged and grounded", () => {
    expect(seedResume.profile.summaryDerived).toBe(true);
    for (const n of ["68%", "87%", "Zolve", "NUS", "IIT Kharagpur", "Titan"]) expect(seedResume.profile.summary).toContain(n);
  });
});

describe("templates", () => {
  it("there are nine, each fully described", () => {
    expect(CONCEPTS.length).toBe(9);
    expect(TEMPLATES.map((t) => t.id)).toEqual([...CONCEPTS]);
    for (const c of CONCEPTS) {
      const d = CONCEPT_DEFS[c];
      expect(d.label && d.blurb && d.bestFor && d.greeting && d.launchLabel).toBeTruthy();
      for (const [f] of d.fonts) expect(PAIRINGS[f]).toBeDefined();
      for (const [h] of d.heroes) expect(HEROES).toContain(h);
    }
  });
  it("each template's starting design is valid and accessible in both themes", () => {
    for (const c of CONCEPTS) {
      const g = templateGenome(seedResume, c);
      expect(g.concept).toBe(c);
      expect(g.seed).toBe(TEMPLATE_SEEDS[c]);
      expect(GenomeSchema.safeParse(g).success).toBe(true);
      expect(auditPalette(g.palette.light as never)).toEqual([]);
      expect(auditPalette(g.palette.dark as never)).toEqual([]);
    }
  });
  it("remixing within a template keeps the template and varies the look", () => {
    for (const c of CONCEPTS) {
      const gs = Array.from({ length: 12 }, (_, i) => generateGenome(seedResume, { seed: i * 7919 + 1, concept: c }));
      expect(new Set(gs.map((g) => g.concept))).toEqual(new Set([c]));
      expect(new Set(gs.map((g) => `${g.accentHue}|${g.fonts}|${g.sections.telemetry}|${g.order}`)).size).toBeGreaterThan(6);
    }
  });
  it("swatches exist for the picker", () => {
    const s = templateSwatches();
    for (const c of CONCEPTS) expect(s[c].every((x) => /^#[0-9a-f]{6}$/i.test(x))).toBe(true);
  });
  it("affinity steers résumés toward fitting templates", () => {
    const top = (t: string) => Object.entries(conceptAffinity(t)).sort((a, b) => b[1] - a[1])[0]![0];
    expect(top("PhD candidate, research publications in a journal, thesis on conference paper, postdoc lab")).toBe("scholar");
    expect(top("Structural civil engineer: AutoCAD, SolidWorks, MATLAB/Simulink, mechanical design")).toBe("blueprint");
    expect(top("VP of Engineering, co-founder, head of platform, chief architect")).toBe("noir");
  });
  it("monogram initials work for any name", () => {
    expect(initials("Dhruv Goyal")).toBe("DG");
    expect(initials("Cher")).toBe("CH");
    expect(initials("  maya  de la cruz ")).toBe("MC");
    expect(initials("")).toBe("");
  });
});
