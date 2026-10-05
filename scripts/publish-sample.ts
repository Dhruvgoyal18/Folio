/**
 * Publishes the bundled sample résumé to a running server (for Lighthouse, screenshots, demos).
 *   npx tsx scripts/publish-sample.ts [slug] [concept] [seed]
 */
import { readFileSync } from "node:fs";
import { parseResumeText } from "../src/extract/heuristic";
import { normalize } from "../src/extract/normalize";
import { generateGenome } from "../src/genome/generate";
import type { Concept } from "../src/genome/schema";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const [slug = "maya-chen", concept = "editorial", seed = "23"] = process.argv.slice(2);
const { draft } = parseResumeText(readFileSync("public/samples/maya-chen.txt", "utf8"));
const { resume } = normalize(draft);
const genome = generateGenome(resume, { seed: Number(seed), concept: concept as Concept });
const res = await fetch(`${BASE}/api/sites`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft, genome, slug }) });
console.log(res.status, await res.text());
