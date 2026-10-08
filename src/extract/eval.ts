import type { Draft } from "./draft";
import { parseDate } from "./dates";

/**
 * Field-level scoring of a parsed Draft against a hand-checked expectation. Scores are kept per
 * field family (never one blended number), so a regression in one area can't hide behind a gain
 * in another. Used by tests/unit/parser-quality.test.ts and `npm run eval:parser`.
 */
export type Expected = {
  name: string;
  email?: string;
  experience: Array<{ org: string; role: string; start?: string; end?: string }>;
  education: string[];
  projects?: string[];
  bullets?: number;
  skillsAtLeast?: number;
};

export type FamilyScore = { expected: number; found: number; correct: number };
export const FAMILIES = ["identity", "entries", "orgRole", "dates", "education", "projects", "bullets", "skills"] as const;
export type Family = (typeof FAMILIES)[number];
export type Score = Record<Family, FamilyScore> & { misses: string[] };

const norm = (s: string | undefined) => (s ?? "").toLowerCase().normalize("NFKC").replace(/[\s ]+/g, " ").replace(/^[\s\-–—|,.:;]+|[\s\-–—|,.:;]+$/g, "").trim();
const same = (a: string | undefined, b: string | undefined) => norm(a) === norm(b);
/** orgs/roles match if equal, or one is the other plus a qualifier ("Kakao Corp" vs "Kakao Corp, Seoul") */
const close = (a: string, b: string) => same(a, b) || ((norm(a).startsWith(norm(b)) || norm(b).startsWith(norm(a))) && Math.abs(norm(a).length - norm(b).length) <= 8);

function dateOk(raw: string | undefined, want: string | undefined): boolean {
  if (want === undefined) return true;
  const got = parseDate(raw);
  if (want === "present") return got === null;
  if (!got) return false;
  return want.length === 4 ? got.startsWith(want) : got === want;
}

export function scoreDraft(d: Draft, e: Expected): Score {
  const misses: string[] = [];
  const f = (expected: number, found: number, correct: number): FamilyScore => ({ expected, found, correct });

  // identity: name + email
  const idExp = 1 + (e.email ? 1 : 0);
  let idOk = 0;
  if (same(d.name, e.name)) idOk++;
  else misses.push(`name: got "${d.name}", want "${e.name}"`);
  if (e.email) {
    if (same(d.email, e.email)) idOk++;
    else misses.push(`email: got "${d.email ?? ""}", want "${e.email}"`);
  }

  // experience entries: matched by org (closest), then role + dates checked on the match
  const used = new Set<number>();
  let entriesOk = 0;
  let orgRoleOk = 0;
  let datesOk = 0;
  for (const want of e.experience) {
    const i = d.experience.findIndex((x, j) => !used.has(j) && (close(x.org, want.org) || (close(x.role, want.role) && close(x.org, want.org.split(/[,|]/)[0]!))));
    if (i < 0) {
      misses.push(`entry missing: ${want.role} @ ${want.org}`);
      continue;
    }
    used.add(i);
    entriesOk++;
    const got = d.experience[i]!;
    if (close(got.org, want.org) && close(got.role, want.role)) orgRoleOk++;
    else misses.push(`org/role: got "${got.role}" @ "${got.org}", want "${want.role}" @ "${want.org}"`);
    if (dateOk(got.start, want.start) && dateOk(got.end, want.end)) datesOk++;
    else misses.push(`dates for ${want.org}: got ${got.start ?? "?"} – ${got.end ?? "?"}, want ${want.start} – ${want.end}`);
  }
  for (const [j, x] of d.experience.entries()) if (!used.has(j)) misses.push(`extra entry: ${x.role} @ ${x.org}`);

  const eduOk = e.education.filter((w) => d.education.some((x) => close(x.institution, w))).length;
  for (const w of e.education) if (!d.education.some((x) => close(x.institution, w))) misses.push(`education missing: ${w}`);

  const projExp = e.projects ?? [];
  const projOk = projExp.filter((w) => d.projects.some((p) => same(p.title, w))).length;
  for (const w of projExp) if (!d.projects.some((p) => same(p.title, w))) misses.push(`project missing: ${w}`);

  const bulletsGot = d.experience.reduce((a, x) => a + x.groups.reduce((b, g) => b + g.bullets.length, 0), 0) + d.projects.reduce((a, p) => a + p.bullets.length, 0) + d.competitions.reduce((a, c) => a + c.bullets.length, 0);
  const bulletsExp = e.bullets ?? 0;
  const bulletsOk = e.bullets === undefined ? 0 : Math.min(bulletsGot, bulletsExp);
  if (e.bullets !== undefined && bulletsGot !== bulletsExp) misses.push(`bullets: got ${bulletsGot}, want ${bulletsExp}`);

  const skillsGot = d.skills.reduce((a, s) => a + s.items.length, 0);
  const skillsExp = e.skillsAtLeast ? 1 : 0;
  const skillsOk = e.skillsAtLeast && skillsGot >= e.skillsAtLeast ? 1 : 0;
  if (e.skillsAtLeast && !skillsOk) misses.push(`skills: got ${skillsGot}, want ≥ ${e.skillsAtLeast}`);

  return {
    identity: f(idExp, idExp, idOk),
    entries: f(e.experience.length, d.experience.length, entriesOk),
    orgRole: f(e.experience.length, d.experience.length, orgRoleOk),
    dates: f(e.experience.length, d.experience.length, datesOk),
    education: f(e.education.length, d.education.length, eduOk),
    projects: f(projExp.length, projExp.length ? d.projects.length : 0, projOk),
    bullets: f(bulletsExp, e.bullets === undefined ? 0 : bulletsGot, bulletsOk),
    skills: f(skillsExp, skillsExp, skillsOk),
    misses,
  };
}

/** Sum family scores across fixtures; precision = correct / found, recall = correct / expected. */
export function summarize(scores: Score[]) {
  return Object.fromEntries(
    FAMILIES.map((k) => {
      const t = scores.reduce((a, s) => ({ expected: a.expected + s[k].expected, found: a.found + s[k].found, correct: a.correct + s[k].correct }), { expected: 0, found: 0, correct: 0 });
      return [k, { ...t, precision: t.found ? t.correct / t.found : 1, recall: t.expected ? t.correct / t.expected : 1 }];
    }),
  ) as Record<Family, FamilyScore & { precision: number; recall: number }>;
}
