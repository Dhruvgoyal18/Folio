import type { Resume } from "@/data/schema";
import { chunks, type Chunk } from "./knowledge";
import { refusalOffTopic } from "./guard";
import { dateRange, firstName } from "@/lib/resume";

/**
 * Offline fallback (no API key, upstream error): BM25 over resume chunks.
 * It never paraphrases. It quotes the matching lines so it cannot hallucinate.
 */

const STOP = new Set(
  "a an the and or but of to in on at for with by from is are was were be been do does did has have had his he him what which who whom whose how when where why can could would should tell me about any some this that these those it its as into your you please i we our there their them does more tell know give show list describe explain work worked working works use used using".split(" "),
);

const SYN: Record<string, string> = {
  worked: "work", working: "work", works: "work", jobs: "job", employer: "company", companies: "company",
  built: "built", build: "built", building: "built", skills: "skill", technologies: "tech", technology: "tech",
  studied: "study", studies: "study", university: "college", awards: "award", medals: "medal", won: "won", win: "won",
  agents: "agent", agentic: "agent", llms: "llm", models: "model", projects: "project", internships: "internship",
  reach: "contact", hire: "contact", email: "email", mail: "email", sql: "sql", nl2sql: "sql", "text-to-sql": "sql",
  ml: "ml", machine: "ml", learning: "ml", forecasting: "forecast", forecasts: "forecast",
};

export function tokenize(s: string, extraStop?: Set<string>): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s/]+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .flatMap((w) => (w.includes("-") ? [w, ...w.split("-")] : [w]))
    .filter((w) => w && !STOP.has(w) && !extraStop?.has(w))
    .map((w) => SYN[w] ?? w);
}

type Index = { docs: Array<{ c: Chunk; tf: Map<string, number>; len: number }>; df: Map<string, number>; avg: number };

const cache = new WeakMap<Resume, Index>();
function index(r: Resume): Index {
  const hit = cache.get(r);
  if (hit) return hit;
  const docs = chunks(r).map((c) => {
    const toks = tokenize(`${c.text} ${c.boost ?? ""}`);
    const tf = new Map<string, number>();
    toks.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    return { c, tf, len: toks.length };
  });
  const df = new Map<string, number>();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const idx = { docs, df, avg: docs.reduce((a, d) => a + d.len, 0) / docs.length };
  cache.set(r, idx);
  return idx;
}

/** The person's own name never discriminates between their resume chunks. */
const nameStop = (r: Resume) => new Set(r.profile.name.toLowerCase().split(/\s+/).flatMap((w) => [w, `${w}'s`]));

export function search(r: Resume, q: string, k = 3) {
  const { docs, df, avg } = index(r);
  const qt = [...new Set(tokenize(q, nameStop(r)))];
  const N = docs.length;
  const scored = docs.map((d) => {
    let s = 0;
    for (const t of qt) {
      // binary term frequency: a chunk that repeats "Zolve" four times isn't four times more about Zolve
      const f = d.tf.has(t) ? 1 : 0;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.len / avg))));
    }
    return { chunk: d.c, score: s };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

export const OFFLINE_PREFIX = "Quoting the resume directly:";

const CAREER = /\b(where|which|what)\b[^?]{0,30}\b(work|worked|employ|employed|employers?|companies)\b|\bwork (history|experience)\b|\bcareer\b|\b(all|his|her|their) (roles|jobs|positions)\b/i;

export function answerFromResume(r: Resume, question: string): { text: string; cites: string[] } {
  if (CAREER.test(question)) {
    const roles = [...r.experience].sort((a, b) => b.start.localeCompare(a.start));
    return {
      text: `${OFFLINE_PREFIX}\n${roles.map((e) => `- ${e.role}, ${e.org} (${e.type}, ${dateRange(e.start, e.end, e.yearOnly)})`).join("\n")}`,
      cites: roles.map((e) => e.id).slice(0, 4),
    };
  }
  const hits = search(r, question, 4);
  const top = hits[0];
  if (!top || top.score < 1.6) return { text: refusalOffTopic(firstName(r)), cites: [] };
  const keep = hits.filter((h) => h.score >= top.score * 0.6).slice(0, 3);
  const text = `${OFFLINE_PREFIX}\n${keep.map((h) => `- ${h.chunk.text}`).join("\n")}`;
  const cites = [...new Set(keep.flatMap((h) => h.chunk.cites))].slice(0, 4);
  return { text, cites };
}
