import { ResumeSchema, type Resume, type Highlight, type Skill } from "@/data/schema";
import type { Draft } from "./draft";
import { hasMonth, parseDate } from "./dates";
import { findMetrics, pickKpis, type FoundMetric } from "./metrics";
import { classifySkill, domainFromGroup, GENERIC_DOMAINS, mentions, skillsInText, type GenericDomain } from "./skills";

/**
 * Draft → strict Resume. Deterministic and conservative:
 * - every text field is copied, never rewritten (composed text is flagged `derived`)
 * - skills are linked to a bullet only when the bullet names them
 * - metrics are numbers that appear in the bullet
 * Anything the parser had to assume is recorded in meta.notes for the review screen.
 */

const kebab = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+\+/g, "pp")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "") || "x"; // trim again: the cut can land on a dash ("…-of-" → "…-of")

function uniqueIds() {
  const used = new Set<string>();
  return (base: string) => {
    let id = kebab(base);
    if (!used.has(id)) return used.add(id), id;
    for (let i = 2; ; i++) if (!used.has(`${id}-${i}`)) return used.add(`${id}-${i}`), `${id}-${i}`;
  };
}

const SUFFIX = /\b(private limited|pvt\.? ltd\.?|limited|ltd\.?|inc\.?|llc|l\.l\.c\.|corporation|corp\.?|company|co\.|gmbh|s\.a\.|plc|technologies|technology|innovations|solutions|labs?|systems|group|software)\b\.?/gi;
const STOPWORDS = new Set(["of", "and", "the", "for", "at", "in", "&"]);

/** "Zolve Innovations Private Limited" → "Zolve"; "AI Institute, National University of Singapore" → "NUS · AI Institute". */
export function shortOrg(org: string): string {
  const parts = org.split(/\s*,\s*/).filter(Boolean);
  const acronym = (s: string) =>
    s
      .split(/\s+/)
      .filter((w) => !STOPWORDS.has(w.toLowerCase()) && /^[A-Z]/.test(w))
      .map((w) => w[0])
      .join("");
  const shorten = (s: string) => {
    const stripped = s.replace(SUFFIX, "").replace(/\s{2,}/g, " ").trim() || s;
    if (stripped.length <= 22) return stripped;
    const a = acronym(stripped);
    return a.length >= 2 ? a : stripped.slice(0, 22);
  };
  const shortInst = (s: string) => (s.length <= 22 ? s : acronym(s).length >= 2 ? acronym(s) : s.slice(0, 22));
  if (parts.length > 1) {
    const inst =
      parts.find((p) => /universit/i.test(p)) ?? parts.find((p) => /institut|college|school|academy/i.test(p)) ?? parts[parts.length - 1]!;
    const other = parts.find((p) => p !== inst)!;
    const isInst = /universit|institut|college|school|academy/i.test(inst);
    const i = isInst ? shortInst(inst) : shorten(inst);
    // "Indian Institute of Technology, Kharagpur" → "IIT Kharagpur" (campus/city suffix)
    if (isInst && /^[A-Z][\p{L}-]+$/u.test(other) && other.length <= 14) return `${i} ${other}`;
    const o = shorten(other);
    return o.length <= 14 ? `${i} · ${o}` : i;
  }
  if (/universit|institut|college|school|academy/i.test(org)) return shortInst(org);
  return shorten(org);
}

function experienceType(t: string | undefined, role: string): Resume["experience"][number]["type"] {
  const s = `${t ?? ""} ${role}`.toLowerCase();
  if (/intern/.test(s)) return "Internship";
  if (/part[- ]time/.test(s)) return "Part-time";
  if (/contract/.test(s)) return "Contract";
  if (/freelance|self-employed/.test(s)) return "Freelance";
  if (/volunteer/.test(s)) return "Volunteer";
  if (/leadership|position|responsib|extracurricular|activit/.test(s)) return "Leadership";
  if (/full[- ]time/.test(s) || !t) return "Full-time";
  return "Other";
}

function linkKind(url: string): Resume["profile"]["links"][number]["kind"] {
  const u = url.toLowerCase();
  if (u.startsWith("mailto:")) return "email";
  if (u.startsWith("tel:")) return "phone";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("github.com")) return "github";
  return "website";
}
const withScheme = (u: string) => (/^(https?:|mailto:|tel:)/i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`);

function medalOf(text: string): Resume["awards"][number]["medal"] {
  const t = text.toLowerCase();
  if (/\bgold|winner|first place|1st\b/.test(t)) return t.includes("team") ? "team" : "gold";
  if (/silver|second|2nd/.test(t)) return "silver";
  if (/bronze|third|3rd/.test(t)) return "bronze";
  if (/\b\d+(st|nd|rd|th)\b|rank|top \d+/.test(t)) return "rank";
  return "other";
}

const sentence = (s: string) => s.replace(/\s+/g, " ").trim();

export type NormalizeResult = { resume: Resume; notes: string[] };

/** A bullet worth keeping: some letters or digits once list markers and dashes are stripped. */
const cleanBullet = (b: string) => b.replace(/\s+/g, " ").trim().replace(/^[•●▪‣◦\-*–—·]+\s*/, "").trim();
const hasContent = (b: string) => /[\p{L}\p{N}]/u.test(cleanBullet(b));

export function normalize(input: Draft, source = "upload"): NormalizeResult {
  // drop bullets/coursework/skills that are only punctuation, and entries left empty by that
  const d: Draft = {
    ...input,
    experience: input.experience.map((e) => ({ ...e, groups: e.groups.map((g) => ({ ...g, bullets: g.bullets.filter(hasContent) })) })),
    projects: input.projects.map((p) => ({ ...p, bullets: p.bullets.filter(hasContent) })),
    competitions: input.competitions.map((c) => ({ ...c, bullets: c.bullets.filter(hasContent) })),
    skills: input.skills.map((g) => ({ ...g, items: g.items.filter(hasContent) })),
    education: input.education.map((e) => ({ ...e, coursework: e.coursework.filter(hasContent) })),
    awards: input.awards.filter((a) => hasContent(a.text)),
  };
  const notes: string[] = [];
  const id = uniqueIds();
  const thisYear = new Date().getUTCFullYear();
  const date = (s: string | undefined, label: string, fallback: string): string => {
    const v = parseDate(s);
    if (v) return v;
    notes.push(`${label}: no ${s ? `readable date in "${s}"` : "date found"} — set to ${fallback}; please check.`);
    return fallback;
  };

  /* ---- skills from the Skills section ---- */
  const domainIds = new Map<string, string>(); // domain id → label
  const skills: Skill[] = [];
  const skillByName = new Map<string, Skill>();
  const addSkill = (rawName: string, listed: boolean, group?: string): Skill | null => {
    const name = rawName.replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
    if (!name || name.length > 48) return null;
    const known = classifySkill(name);
    const key = (known?.name ?? name).toLowerCase();
    const existing = skillByName.get(key);
    if (existing) return existing;
    const groupDomain = domainFromGroup(group);
    let domain: string;
    if (known) domain = known.domain;
    else if (groupDomain) domain = groupDomain;
    else if (group) domain = `g-${kebab(group)}`.slice(0, 40);
    else domain = "other";
    const label = (GENERIC_DOMAINS as Record<string, string>)[domain] ?? group ?? GENERIC_DOMAINS.other;
    domainIds.set(domain, label);
    const s: Skill = { id: id(`s-${known?.name ?? name}`), name: known?.name && known.name.toLowerCase() === name.toLowerCase() ? known.name : name, domain, listed, ...(group ? { listGroup: group } : {}) };
    skills.push(s);
    skillByName.set(key, s);
    return s;
  };
  for (const g of d.skills) if (!/coursework/i.test(g.group ?? "")) for (const item of g.items) addSkill(item, true, g.group);

  /* ---- highlights: text, linked skills, metrics ---- */
  const metricRefs: Array<{ ownerId: string; metric: FoundMetric; h: Highlight }> = [];
  const makeHighlight = (text: string, ownerId: string): Highlight => {
    const t = cleanBullet(text);
    const linked = new Set<string>();
    for (const s of skills) if (mentions(t, s.name)) linked.add(s.id);
    // vocabulary skills the bullet names but the Skills section doesn't list
    for (const hit of skillsInText(t)) {
      const s = addSkill(hit.name, false);
      if (s) linked.add(s.id);
    }
    const h: Highlight = { id: id(`h-${ownerId}`), text: t, skills: [...linked], metrics: [] };
    for (const m of findMetrics(t)) metricRefs.push({ ownerId, metric: m, h });
    return h;
  };

  /* ---- experience ---- */
  const experience: Resume["experience"] = [];
  for (const e of d.experience) {
    const groups = e.groups.filter((g) => g.bullets.length);
    if (!groups.length) {
      notes.push(`${e.role} at ${e.org}: no bullet points found — add some so the role has detail.`);
    }
    const expId = id(`exp-${shortOrg(e.org)}`);
    const start = date(e.start, `${e.role} at ${e.org} (start)`, `${thisYear}-01`);
    const endParsed = parseDate(e.end);
    if (endParsed === undefined && e.end) notes.push(`${e.role} at ${e.org}: couldn't read end date "${e.end}" — treated as current; please check.`);
    const end = endParsed ?? null;
    experience.push({
      id: expId,
      org: e.org,
      orgShort: shortOrg(e.org),
      role: e.role,
      type: experienceType(e.type, e.role),
      ...(e.location ? { location: e.location } : {}),
      start,
      end: end && end < start ? start : end,
      ...(!hasMonth(e.start) && (!e.end || parseDate(e.end) === null || !hasMonth(e.end)) ? { yearOnly: true } : {}),
      groups: (groups.length ? groups : [{ title: undefined, bullets: [`${e.role} at ${e.org}.`] }]).map((g) => ({
        ...(g.title ? { title: g.title } : {}),
        highlights: g.bullets.map((b) => makeHighlight(b, expId)),
      })),
    });
  }

  /* ---- competitions ---- */
  const competitions: Resume["competitions"] = d.competitions
    .filter((c) => c.bullets.length)
    .map((c) => {
      const cid = id(`comp-${c.name}`);
      const start = date(c.start, `${c.name} (start)`, `${thisYear}-01`);
      const end = parseDate(c.end) ?? start;
      return { id: cid, name: c.name, ...(c.name.length > 24 ? { short: shortOrg(c.name.split(/[–—:-]/)[0]!.trim()) } : {}), result: c.result || "Participant", start, end: end < start ? start : end, ...(!hasMonth(c.start) && !hasMonth(c.end) ? { yearOnly: true } : {}), highlights: c.bullets.map((b) => makeHighlight(b, cid)) };
    });

  /* ---- projects from a Projects section ---- */
  const projects: Resume["projects"] = [];
  for (const p of d.projects.filter((x) => x.bullets.length)) {
    const pid = id(`proj-${p.title}`);
    const hs = p.bullets.map((b) => makeHighlight(b, pid));
    projects.push({
      id: pid,
      codename: "",
      title: p.title,
      summary: hs[0]!.text,
      derived: false,
      highlightIds: [],
      highlights: hs,
      ...(parseDate(p.start) ? { start: parseDate(p.start)! } : {}),
      ...(p.link ? { link: withScheme(p.link) } : {}),
    });
  }
  /* ---- otherwise: case files regrouped from roles (summary = their first line, flagged derived) ---- */
  if (!projects.length) {
    for (const e of experience) {
      const groups = e.groups.filter((g) => g.highlights.length >= 1);
      const titled = groups.filter((g) => g.title);
      const sources = titled.length ? titled : groups.flatMap((g) => g.highlights).length >= 2 ? [{ title: undefined, highlights: groups.flatMap((g) => g.highlights) }] : [];
      for (const g of sources) {
        projects.push({
          id: id(`proj-${g.title ?? e.orgShort}`),
          codename: "",
          title: g.title ?? `${e.role}, ${e.orgShort}`,
          summary: g.highlights[0]!.text,
          derived: true,
          source: { kind: "experience", id: e.id },
          highlightIds: g.highlights.map((h) => h.id),
          highlights: [],
        });
      }
    }
    for (const c of competitions) {
      projects.push({ id: id(`proj-${c.name}`), codename: "", title: c.name, summary: c.highlights[0]!.text, derived: true, source: { kind: "competition", id: c.id }, highlightIds: c.highlights.map((h) => h.id), highlights: [] });
    }
  }

  /* ---- metrics → highlights, top ones become KPIs ---- */
  const kpiSet = pickKpis(metricRefs, 6);
  for (const ref of metricRefs) {
    const { score: _s, ...metric } = ref.metric;
    ref.h.metrics.push({ ...metric, kpi: kpiSet.has(ref) });
  }

  /* ---- codenames: WORD-NUMBER from the case file's lead metric ---- */
  const hById = new Map([...experience.flatMap((e) => e.groups.flatMap((g) => g.highlights)), ...competitions.flatMap((c) => c.highlights), ...projects.flatMap((p) => p.highlights)].map((h) => [h.id, h]));
  const usedCodes = new Set<string>();
  projects.forEach((p, i) => {
    const hs = [...p.highlightIds.map((x) => hById.get(x)!), ...p.highlights];
    const m = hs.flatMap((h) => h.metrics)[0];
    const word = ((p.title.match(/[A-Za-z]{3,}/g) ?? []).find((w) => !STOPWORDS.has(w.toLowerCase())) ?? "CASE").toUpperCase().slice(0, 8);
    let code = m ? `${word}-${String(Math.round(m.value)).slice(0, 5)}` : `${word}-${String(i + 1).padStart(2, "0")}`;
    while (usedCodes.has(code)) code += "B";
    usedCodes.add(code);
    p.codename = code;
  });

  /* ---- education ---- */
  const courseworkFromSkills = d.skills.find((g) => /coursework/i.test(g.group ?? ""))?.items ?? [];
  const education: Resume["education"] = d.education.map((e, i) => {
    const end = date(e.end ?? e.start, `${e.institution} (end)`, `${thisYear}-06`);
    const start = parseDate(e.start) ?? end;
    return {
      id: id(`edu-${shortOrg(e.institution)}`),
      institution: e.institution,
      ...(e.institution.length > 24 ? { short: shortOrg(e.institution) } : {}),
      degree: e.degree,
      start: start > end ? end : start,
      end,
      ...(!hasMonth(e.start) && !hasMonth(e.end) ? { yearOnly: true } : {}),
      coursework: e.coursework.length ? e.coursework : i === 0 ? courseworkFromSkills : [],
    };
  });
  /* ---- awards ---- */
  const awards: Resume["awards"] = d.awards.map((a) => {
    const yr = a.year?.match(/(19|20)\d{2}/)?.[0] ?? a.text.match(/\b(19|20)\d{2}\b/)?.[0];
    return {
      id: id(`award-${(a.title ?? a.text).slice(0, 30)}`),
      title: a.title ?? (a.text.length > 60 ? `${a.text.slice(0, 57).replace(/\s+\S*$/, "")}…` : a.text),
      text: a.text,
      ...(yr ? { year: +yr } : {}),
      medal: medalOf(a.title ?? a.text),
    };
  });

  /* ---- profile ---- */
  const main = experience.filter((e) => e.type !== "Leadership" && e.type !== "Volunteer");
  const pool = main.length ? main : experience;
  const current = [...pool].filter((e) => e.end === null).sort((a, b) => b.start.localeCompare(a.start))[0] ?? [...pool].sort((a, b) => b.start.localeCompare(a.start))[0];
  const topDomains = [...domainIds.entries()]
    .map(([k, label]) => ({ k, label, n: skills.filter((s) => s.domain === k && s.listed).length }))
    .sort((a, b) => b.n - a.n)
    .filter((x) => x.n > 0)
    .slice(0, 2)
    .map((x) => x.label.replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase()));
  let headline = d.headline;
  let headlineDerived = false;
  if (!headline && d.summary) {
    const first = d.summary.split(/(?<=[.!?])\s+/)[0]!;
    if (first.length <= 140) headline = first.replace(/[.!?]$/, "");
  }
  if (!headline) {
    headlineDerived = true;
    const role = current?.role ?? education[0]?.degree ?? "Professional";
    headline = topDomains.length ? `${role} working across ${topDomains.join(" and ")}` : role;
    notes.push(`Headline was written from your roles and skills ("${headline}") — edit it if you'd like your own wording.`);
  }
  const initials = d.name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).join("").slice(0, 3) || "ME";
  const links: Resume["profile"]["links"] = [];
  const email = d.email?.replace(/^mailto:/i, "").trim();
  if (email) links.push({ kind: "email", label: email, href: `mailto:${email}` });
  if (d.phone) links.push({ kind: "phone", label: d.phone, href: `tel:${d.phone.replace(/[^\d+]/g, "")}` });
  for (const l of d.links) {
    const href = withScheme(l.url.trim());
    const kind = linkKind(href);
    if (kind === "email" || kind === "phone" || links.some((x) => x.href === href)) continue;
    links.push({ kind, label: l.label || (kind === "linkedin" ? "LinkedIn" : kind === "github" ? "GitHub" : href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")), href });
  }

  const domains = [...domainIds.entries()].filter(([k]) => skills.some((s) => s.domain === k)).map(([k, label]) => ({ id: k, label }));
  const draftResume = {
    meta: { source, parsedAt: new Date().toISOString().slice(0, 10), notes },
    profile: {
      name: d.name,
      callsign: `${initials}-01`,
      headline,
      headlineDerived,
      ...(d.summary ? { summary: d.summary } : {}),
      currentRole: current ? `${current.role} at ${current.orgShort}` : "",
      ...(d.location ? { location: d.location } : {}),
      ...(email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? { email } : {}),
      ...(d.phone ? { phone: d.phone } : {}),
      links,
    },
    domains,
    education,
    skills,
    experience,
    competitions,
    awards,
    projects,
  };
  return { resume: validateOrRepair(draftResume, notes), notes };
}

/**
 * Last line of defence: anything the steps above couldn't make valid is repaired rather than
 * thrown, so a strange résumé never blocks the owner. Bad ids are re-minted, a bad link is
 * dropped, and as a final resort the offending entry is removed — each repair is noted for review.
 */
function validateOrRepair(input: unknown, notes: string[]): Resume {
  const data = structuredClone(input) as Record<string, unknown>;
  for (let attempt = 0; attempt < 25; attempt++) {
    const parsed = ResumeSchema.safeParse(data);
    if (parsed.success) return parsed.data;
    const issue = parsed.error.issues[0]!;
    const path = issue.path as Array<string | number>;
    const get = (p: Array<string | number>) => p.reduce<any>((o, k) => o?.[k], data); // eslint-disable-line @typescript-eslint/no-explicit-any
    // 0) cross-reference problems reported at the root by the schema's checks
    const ref = issue.message.match(/project (\S+) references unknown highlight (\S+)/);
    if (ref) {
      const projects = data.projects as Array<{ id: string; highlightIds: string[]; highlights: unknown[] }>;
      const p = projects.find((x) => x.id === ref[1]);
      if (p) {
        p.highlightIds = p.highlightIds.filter((h) => h !== ref[2]);
        if (!p.highlightIds.length && !p.highlights.length) projects.splice(projects.indexOf(p), 1);
        continue;
      }
    }
    const sk = issue.message.match(/highlight (\S+) references unknown skill (\S+)/);
    if (sk) {
      const strip = (o: any): void => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Array.isArray(o)) o.forEach(strip);
        else if (o && typeof o === "object") {
          if (o.id === sk[1] && Array.isArray(o.skills)) o.skills = o.skills.filter((x: string) => x !== sk[2]);
          Object.values(o).forEach(strip);
        }
      };
      strip(data);
      continue;
    }
    const dom = issue.message.match(/unknown domain (\S+)/);
    if (dom) {
      (data.domains as Array<{ id: string; label: string }>).push({ id: dom[1]!, label: "Other skills" });
      continue;
    }
    const dup = issue.message.match(/duplicate id (\S+)/i);
    if (dup) {
      let seen = 0;
      const remint = (o: any): void => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Array.isArray(o)) o.forEach(remint);
        else if (o && typeof o === "object") {
          if (o.id === dup[1] && seen++ > 0) o.id = `${dup[1]}-dup-${seen}`;
          Object.values(o).forEach(remint);
        }
      };
      remint(data);
      if (seen > 1) continue;
    }
    const order = issue.message.match(/^(\S+) ends before it starts/);
    if (order) {
      const fix = (o: any): void => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Array.isArray(o)) o.forEach(fix);
        else if (o && typeof o === "object") {
          if (o.id === order[1] && o.start) o.end = o.start;
          Object.values(o).forEach(fix);
        }
      };
      fix(data);
      continue;
    }
    const noBullets = issue.message.match(/project (\S+) (?:has no bullets|has unknown source)/);
    if (noBullets) {
      const projects = data.projects as Array<{ id: string }>;
      const i = projects.findIndex((x) => x.id === noBullets[1]);
      if (i >= 0) {
        projects.splice(i, 1);
        continue;
      }
    }
    // optional fields with a bad value are simply left out (e.g. an e-mail the validator rejects)
    const last = path[path.length - 1];
    const OPTIONAL = new Set(["email", "phone", "location", "summary", "link", "short", "year", "title", "original", "source", "start", "listGroup"]);
    if (typeof last === "string" && OPTIONAL.has(last)) {
      const holder = get(path.slice(0, -1));
      if (holder && last in holder) {
        delete holder[last];
        if (last === "email") notes.push("The e-mail address couldn't be read, so it was left off — add it on the review screen.");
        continue;
      }
    }
    // 1) ids: re-mint the offending id in place
    if (path[path.length - 1] === "id" && /kebab/.test(issue.message)) {
      const holder = path.slice(0, -1).reduce<any>((o, k) => o?.[k], data); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (holder) {
        holder.id = kebab(String(holder.id)) + `-${attempt}`;
        continue;
      }
    }
    // 2) drop the smallest enclosing array element that holds the problem
    let dropped = false;
    for (let i = path.length - 1; i > 0; i--) {
      if (typeof path[i] !== "number") continue;
      const arr = path.slice(0, i).reduce<any>((o, k) => o?.[k], data); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!Array.isArray(arr)) continue;
      // keep groups/highlights non-empty: drop at the level where the array can lose an element
      if (arr.length <= 1 && i > 1) continue;
      const [gone] = arr.splice(path[i] as number, 1);
      const what = (gone && (gone.role || gone.title || gone.name || gone.text || gone.label || gone.institution)) ?? path.slice(0, i + 1).join(".");
      notes.push(`Left out “${String(what).slice(0, 60)}” — it couldn't be shown (${issue.message}). Edit it on the review screen to bring it back.`);
      dropped = true;
      break;
    }
    if (!dropped) break;
  }
  const final = ResumeSchema.safeParse(data);
  if (final.success) return final.data;
  throw new Error(`Couldn't build your résumé: ${final.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}

export type { GenericDomain };
