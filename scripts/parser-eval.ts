/**
 * Parser quality report: scores the rule-based parser on every fixture in tests/fixtures against
 * its hand-checked expectation, per field family. `npm run eval:parser` (add --verbose for misses).
 */
import { CORPUS } from "../tests/fixtures/resumes";
import { GOLDEN } from "../tests/fixtures/golden";
import { parseResumeText } from "../src/extract/heuristic";
import { FAMILIES, scoreDraft, summarize } from "../src/extract/eval";

const verbose = process.argv.includes("--verbose");
const scores = Object.entries(GOLDEN).map(([k, g]) => {
  const s = scoreDraft(parseResumeText(CORPUS[k]!).draft, g);
  if (verbose && s.misses.length) console.log(`\n${k}\n  - ${s.misses.join("\n  - ")}`);
  return s;
});
const sum = summarize(scores);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`.padStart(7);
console.log(`\n${"family".padEnd(10)} ${"precision".padStart(9)} ${"recall".padStart(7)}   correct/expected`);
for (const k of FAMILIES) console.log(`${k.padEnd(10)} ${pct(sum[k].precision).padStart(9)} ${pct(sum[k].recall)}   ${sum[k].correct}/${sum[k].expected}`);
console.log(`\n${scores.filter((s) => !s.misses.length).length}/${scores.length} fixtures parsed exactly.`);
