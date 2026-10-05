import type { Metric } from "@/data/schema";

/**
 * Finds quantified results inside a bullet, e.g. "improving SQL accuracy from 68% to 87%",
 * "aggregating 400k+ potential leads", "cut costs by $1.2M", "3x faster".
 * Every metric's value is a number that literally appears in the text (tested), and the
 * label is lifted from the neighbouring words — nothing is invented.
 */

const STOP_AFTER = /^(via|using|by|with|in|for|to|on|at|across|through|and|while|from|over|per|of|into|within|about|lifting|achieving|improving)$/i;
const LEAD_VERBS = /^(achieve|achieved|achieving|reach|reached|reaching|hit|hitting|deliver|delivered|delivering|improving|improved|increasing|increased|boosting|boosted|raising|raised|reducing|reduced|cutting|cut|lowering|lowered|growing|grew|lifting|lifted)$/i;

/** filler between a label and its number: "accuracy of about 83%", "F1 by 27%" */
const FILLER = /^(of|by|about|around|approximately|approx|nearly|almost|roughly|over|than|~|a|an|the)$/i;
/** nouns that need their object: "reduction in peak memory" */
const NEEDS_OBJECT = /^(reduction|increase|improvement|decrease|growth|drop|uplift|gain|boost|rise|savings?|cut)$/i;

function wordsAfter(text: string, from: number, max = 4): string {
  const tail = text.slice(from).replace(/^[\s+%xX×kKmMbB)]+/, "");
  const words = tail.split(/\s+/);
  const out: string[] = [];
  for (const w of words) {
    const clean = w.replace(/[,.;:()]+$/g, "");
    if (clean && out.length === 1 && NEEDS_OBJECT.test(out[0]!) && /^(in|of)$/i.test(clean)) {
      out.push(clean);
      continue;
    }
    if (!clean || STOP_AFTER.test(clean) || /^\d/.test(clean)) break;
    out.push(clean);
    if (/[,.;:)]$/.test(w) || out.length >= max) break;
  }
  return out.join(" ");
}
function wordsBefore(text: string, to: number, max = 3): string {
  const head = text.slice(0, to).trim().split(/\s+/);
  const out: string[] = [];
  for (let i = head.length - 1; i >= 0 && out.length < max; i--) {
    const w = head[i]!.replace(/[,.;:(]+/g, "");
    if (!out.length && FILLER.test(w)) continue;
    if (!w || STOP_AFTER.test(w) || LEAD_VERBS.test(w) || /^\d/.test(w)) break;
    out.unshift(w);
  }
  return out.join(" ");
}

const num = (s: string) => parseFloat(s.replace(/,/g, ""));
const decimalsOf = (s: string) => (s.includes(".") ? Math.min(3, s.split(".")[1]!.length) : 0);

export type FoundMetric = Metric & { score: number };

export function findMetrics(text: string): FoundMetric[] {
  const out: FoundMetric[] = [];
  const taken: Array<[number, number]> = [];
  const free = (a: number, b: number) => !taken.some(([x, y]) => a < y && b > x);
  const add = (m: FoundMetric, a: number, b: number) => {
    if (!free(a, b) || !m.label) return;
    taken.push([a, b]);
    out.push(m);
  };

  // from A% to B%
  for (const m of text.matchAll(/from\s+(\d[\d,]*(?:\.\d+)?)\s*(%?)\s+to\s+(\d[\d,]*(?:\.\d+)?)\s*(%?)/gi)) {
    const label = wordsBefore(text, m.index!) || wordsAfter(text, m.index! + m[0].length);
    const suffix = m[4] || m[2] || "";
    add({ value: num(m[3]!), from: num(m[1]!), prefix: "", suffix, decimals: decimalsOf(m[3]!), label: label || "change", kpi: false, score: 6 }, m.index!, m.index! + m[0].length);
  }
  // money: $1.2M, ₹40L, €300k
  for (const m of text.matchAll(/([$€£₹])\s?(\d[\d,]*(?:\.\d+)?)\s?([kKmMbB](?:n)?|L|Cr)?\+?/g)) {
    const a = m.index!, b = a + m[0].length;
    add({ value: num(m[2]!), prefix: m[1]!, suffix: `${m[3] ?? ""}${m[0].endsWith("+") ? "+" : ""}`, decimals: decimalsOf(m[2]!), label: wordsAfter(text, b) || wordsBefore(text, a), kpi: false, score: 5 }, a, b);
  }
  // percentages (incl. "by 65%", "+27%", "99.93%")
  for (const m of text.matchAll(/([+~>]?)(\d[\d,]*(?:\.\d+)?)\s?%(\+?)/g)) {
    const a = m.index!, b = a + m[0].length;
    const before = text.slice(Math.max(0, a - 4), a).toLowerCase();
    const down = /\b(reduc|cut|lower|decreas|drop|shrank|shrunk|saving|saved)\w*/i.test(text.slice(Math.max(0, a - 80), a));
    const prefix = m[1] || (/by\s$/.test(before) ? (down ? "−" : "+") : "");
    const label = wordsAfter(text, b) || wordsBefore(text, a);
    add({ value: num(m[2]!), prefix, suffix: `%${m[3] ?? ""}`, decimals: decimalsOf(m[2]!), label, kpi: false, score: 4 }, a, b);
  }
  // multiples: 3x, 10×
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s?[x×]\b/g)) {
    const a = m.index!, b = a + m[0].length;
    add({ value: num(m[1]!), prefix: "", suffix: "×", decimals: decimalsOf(m[1]!), label: wordsAfter(text, b) || wordsBefore(text, a), kpi: false, score: 4 }, a, b);
  }
  // magnitudes: 400k+, 5K+, 1.2M, 10,000+
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?([kKmMbB])\b(\+?)|(\d{1,3}(?:,\d{3})+|\d{2,})(\+)/g)) {
    const a = m.index!, b = a + m[0].length;
    if (m[1]) add({ value: num(m[1]), prefix: "", suffix: `${m[2]}${m[3] ?? ""}`, decimals: decimalsOf(m[1]), label: wordsAfter(text, b) || wordsBefore(text, a), kpi: false, score: 3 }, a, b);
    else if (m[4]) {
      const v = num(m[4]);
      if (v >= 1900 && v <= 2100) continue; // years
      add({ value: v, prefix: "", suffix: "+", decimals: 0, label: wordsAfter(text, b) || wordsBefore(text, a), kpi: false, score: 3 }, a, b);
    }
  }
  return out.map((m) => ({ ...m, label: m.label.replace(/^(the|a|an)\s+/i, "").replace(/\s+(in|of)$/i, "").slice(0, 60) }));
}

/** Choose up to `max` headline KPIs, preferring strong metric types and spreading across roles. */
export function pickKpis<T extends { ownerId: string; metric: FoundMetric }>(all: T[], max = 6): Set<T> {
  const sorted = [...all].sort((a, b) => b.metric.score - a.metric.score);
  const chosen = new Set<T>();
  const perOwner = new Map<string, number>();
  for (const pass of [1, 2, 99]) {
    for (const m of sorted) {
      if (chosen.size >= max) break;
      if (chosen.has(m)) continue;
      if ((perOwner.get(m.ownerId) ?? 0) >= pass) continue;
      chosen.add(m);
      perOwner.set(m.ownerId, (perOwner.get(m.ownerId) ?? 0) + 1);
    }
  }
  return chosen;
}
