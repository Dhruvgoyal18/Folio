import { describe, expect, it } from "vitest";
import { CORPUS } from "../fixtures/resumes";
import { GOLDEN } from "../fixtures/golden";
import { parseResumeText } from "@/extract/heuristic";
import { FAMILIES, scoreDraft, summarize } from "@/extract/eval";

/**
 * Parser quality gate. Every fixture with a hand-checked expectation must parse exactly; the
 * per-family summary can only go up. Run `npm run eval:parser` for the full report with misses.
 */
describe("parser matches the hand-checked expectations", () => {
  for (const [name, golden] of Object.entries(GOLDEN)) {
    it(name, () => {
      expect(CORPUS[name], `fixture ${name} is missing`).toBeDefined();
      expect(scoreDraft(parseResumeText(CORPUS[name]!).draft, golden).misses).toEqual([]);
    });
  }
  it("every family is at 100% precision and recall across the corpus", () => {
    const sum = summarize(Object.entries(GOLDEN).map(([k, g]) => scoreDraft(parseResumeText(CORPUS[k]!).draft, g)));
    for (const f of FAMILIES) expect([f, sum[f].precision, sum[f].recall]).toEqual([f, 1, 1]);
  });
  it("every corpus fixture has an expectation", () => {
    expect(Object.keys(CORPUS).filter((k) => !GOLDEN[k] && k !== "longAndRepetitive")).toEqual([]);
  });
});
