import { DraftSchema, tidyDraft, type Draft, type DraftInput } from "./draft";
import { findRange, SINGLE_DATE } from "./dates";

/**
 * Rule-based resume parser (no AI). Handles the common one/two-column text layouts produced by
 * PDF.js / DOCX extraction: section headings, "Org ⇥ dates" entry lines, bullets, "Label: a, b"
 * skill lines. It's deliberately conservative — anything it can't place is reported in
 * `unplaced` for the review screen rather than guessed.
 */

type SectionKey = "summary" | "experience" | "education" | "skills" | "projects" | "awards" | "competitions" | "certifications" | "coursework" | "leadership" | "other";

const HEADINGS: Array<[SectionKey, RegExp]> = [
  ["summary", /^(professional\s+|career\s+)?(summary|profile|objective|about( me)?|career objective|overview)$/i],
  // the same sections in German, French, Spanish, Italian, Portuguese, Dutch and Swedish CVs
  ["summary", /^(profil|kurzprofil|zusammenfassung|perfil( profesional)?|profilo|samenvatting|sammanfattning|à propos)$/i],
  ["experience", /^(berufserfahrung|erfahrung|praxiserfahrung|berufliche erfahrung|exp[ée]riences?( professionnelles?)?|parcours professionnel|experiencia( laboral| profesional)?|esperienz[ae]( lavorativ[ae]| professional[ie])?|experi[êe]ncia( profissional)?|werkervaring|(arbetslivs)?erfarenhet)$/i],
  ["education", /^(ausbildung|bildung|bildungsweg|studium|formation|[ée]ducation|educaci[óo]n|formaci[óo]n( acad[ée]mica)?|istruzione|formazione|educa[çc][ãa]o|forma[çc][ãa]o( acad[êe]mica)?|opleiding(en)?|utbildning)$/i],
  ["skills", /^(kenntnisse|fähigkeiten|kompetenzen|it-kenntnisse|comp[ée]tences( techniques)?|habilidades|competencias|competenze|conhecimentos|compet[êe]ncias|vaardigheden|kompetenser|färdigheter)$/i],
  ["projects", /^(projekte|projets|proyectos|progetti|projetos|projecten|projekt)$/i],
  ["awards", /^(auszeichnungen|distinctions|prix|premios|reconocimientos|riconoscimenti|pr[êe]mios|utmärkelser)$/i],
  ["other", /^(sprachen|langues|idiomas|lingue|talen|språk|interessen|hobbys|loisirs|centres d'int[ée]r[êe]t|intereses|interessi)$/i],
  ["experience", /^(work\s+|professional\s+|relevant\s+|industry\s+|research\s+|clinical\s+|teaching\s+|legal\s+)?(experience|experiences|employment( history)?|work history|career history|internships?|research|teaching)$/i],
  ["education", /^(education|academics?|academic (background|details|qualifications?)|education (&|and) training|educational qualifications?|qualifications)$/i],
  ["skills", /^(technical\s+|key\s+|core\s+|relevant\s+)?(skills|skill set|skills (&|and) (tools|technologies|interests)|technologies|tech stack|tools|competencies|expertise)$/i],
  ["projects", /^((selected|personal|academic|key|side|technical|major|notable)\s+)?projects?( (&|and) research)?$/i],
  ["awards", /^(awards|honou?rs|achievements|scholastic achievements|awards (&|and) (achievements|honou?rs)|honou?rs (&|and) awards|accomplishments|recognition)$/i],
  ["competitions", /^(competitions|hackathons|competitions (&|and) hackathons|contests)$/i],
  ["certifications", /^(certifications?|licenses( (&|and) certifications)?|certifications (&|and) (courses|training)|trainings?|moocs?)$/i],
  ["coursework", /^((relevant|academic|key|selected)\s+)?(coursework|courses)( information| taken| undertaken)?$/i],
  ["leadership", /^(positions? of responsibility|leadership( (&|and) activities| experience| roles?)?|extra[- ]?curricular( activities)?|co[- ]?curricular( activities)?|volunteer(ing| experience| work)?|activities|community (involvement|service)|campus involvement|clubs? (&|and) societies|social work)$/i],
  ["other", /^(interests|hobbies|languages|publications|references|additional information|personal (details|information)|declaration|miscellaneous|others?)$/i],
];

/** Keyword fallback for short ALL-CAPS / Title lines that aren't in the list above (e.g. "PROFESSIONAL EXPERIENCE & INTERNSHIPS"). */
const KEYWORDS: Array<[SectionKey, RegExp]> = [
  ["leadership", /responsibilit|leadership|extra[- ]?curricular|co[- ]?curricular|volunteer|involvement/],
  ["coursework", /coursework|\bcourses\b/],
  ["certifications", /certific|licen[cs]e|\bmoocs?\b/],
  ["competitions", /competition|hackathon/],
  ["awards", /award|honou?r|achievement|accomplishment/],
  ["projects", /\bprojects?\b/],
  ["education", /education|academic/],
  ["skills", /\bskills?\b|technologies|tech stack/],
  ["experience", /experience|employment|work history|internship/],
  ["summary", /summary|objective|profile/],
  ["other", /publication|interest|hobb|language|reference|personal/],
];

const BULLET = /^\s*([•●▪‣◦∙·\-*–]|\d+[.)])\s+/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com|[a-z0-9-]+\.(?:dev|io|me|com|net|org|design|ai|app|xyz))\/?[^\s|,]*)/gi;
const ROLE_WORDS = /\b(engineer|developer|intern|analyst|scientist|designer|manager|lead|head|director|consultant|researcher|associate|assistant|specialist|architect|founder|co-founder|officer|coordinator|executive|administrator|writer|editor|teacher|professor|fellow|trainee|apprentice|technician|strategist|marketer|product|owner|president|vice[- ]president|vp|cto|ceo|cfo|coo|member|secretary|treasurer|captain|representative|organi[sz]er|volunteer|mentor|tutor|convener|convenor|chair|chairperson|governor|ambassador|nominee|delegate|student|leader|programmer|accountant|nurse|physician|lawyer|attorney|paralegal|instructor|lecturer|counsel(l)?or|sales|recruiter|operator|supervisor|partner|principal|staff|sde|swe|mle|ingenieur(in)?|ing[ée]nieure?|ingeniera?|ingegnere|ingenj|entwickler(in)?|softwareentwickler(in)?|d[ée]veloppeu(r|se)|desarrollador(a)?|berater(in)?|consultante?|werkstudent(in)?|praktikant(in)?|stagiaire|becari[oa]|analista|gerente|directeur|directrice|responsable|cheff?e|leiter(in)?|gesch[äa]ftsf[üu]hrer(in)?)\b/i;
const INSTITUTION = /\b(university|institute|college|school|academy|iit|nit|iiit|bits|polytechnic|mit|ucla|nyu)\b/i;
const DEGREE = /\b(bfa|mfa|bba|bca|mca|b\.?\s?com|m\.?\s?com|llb|llm|mbbs|b\.?\s?arch|b\.?\s?des|m\.?\s?des|ph\.?\s?d|b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc?|b\.?a\b|bachelor|m\.?\s?tech|m\.?\s?sc?|m\.?a\b|master|mba|ph\.?\s?d|doctor|diploma|high school|secondary|associate|a-levels|class xii|class x|hsc|ssc)\b/i;
const TYPE_WORDS = /\b(full[- ]time|part[- ]time|internship|intern|contract|freelance|volunteer|remote|hybrid|on-?site)\b/gi;
/** type words that can be stripped from a role title without eating it ("Research Intern" stays) */
const ROLE_STRIP = /\(?\b(full[- ]time|part[- ]time|internship|remote|hybrid|on-?site)\b\)?/gi;

/** text after a date range that only describes the job's form, not its title */
const TYPE_ONLY = /^\(?\s*(full[- ]time|part[- ]time|internship|intern|contract|freelance|volunteer|remote|hybrid|on-?site)(\s*[,/|]\s*(full[- ]time|part[- ]time|internship|remote|hybrid|on-?site))*\s*\)?$/i;
const clean = (s: string) => s.replace(/\t+/g, " ").replace(/\s{2,}/g, " ").trim();
const isHeading = (line: string): SectionKey | null => {
  const t = clean(line).replace(/^[#*_\s]+|[:|_*\s]+$/g, "").replace(/\s+and\s+/gi, " & ").replace(/\s*&\s*/g, " & ");
  if (t.length > 48 || !t || BULLET.test(line)) return null;
  const tt = t.replace(/ & /g, " and ");
  for (const [k, re] of HEADINGS) if (re.test(t) || re.test(tt)) return k;
  // fallback: short heading-like lines (mostly capitals, no digits / dates / sentence punctuation)
  const letters = t.replace(/[^A-Za-z]/g, "");
  const caps = letters.length > 0 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.8;
  if (!caps || /\d|[.,;@]/.test(t) || t.split(/\s+/).length > 5) return null;
  const low = t.toLowerCase();
  for (const [k, re] of KEYWORDS) if (re.test(low)) return k;
  return null;
};

type Entry = { header: string; dates: { start?: string; end?: string }; extra: string[]; groups: Array<{ title?: string; bullets: string[] }>; meta: string };

/** Split a section into entries that start with a dated line (or, for projects, a short title line). */
function entries(lines: string[], opts: { titleStarts?: boolean } = {}): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null;
  let lastWasBullet = false;
  const all = lines.map((l) => l.trim()).filter(Boolean);
  for (let li = 0; li < all.length; li++) {
    const line = all[li]!;
    const bullet = BULLET.test(line);
    const range = findRange(line);
    if (!bullet && range) {
      const before = clean(line.slice(0, range.index)).replace(/[\[({]\s*$/, "").replace(/[,|–—-]\s*$/, "").trim();
      let after = clean(line.slice(range.index + range.length)).replace(/^[\])}]\s*/, "").replace(/^[,|]\s*/, "");
      // dates first: "2020 – 2023 ⇥ Marketing Manager @ Glow" — the text after the dates is the header
      let lead = before;
      if (!before && after.length > 3 && !TYPE_ONLY.test(after)) {
        lead = after;
        after = "";
      }
      const prev = out[out.length - 1];
      if (prev && !prev.groups.some((g) => g.bullets.length || g.title) && !prev.dates.start && prev.extra.length < 2) {
        // dates under a header line we already opened: "Org" ⏎ "Role ⇥ dates", or "Org" ⏎ "dates"
        prev.dates = { start: range.start, end: range.end };
        prev.meta = after;
        if (lead) prev.extra.unshift(lead);
        cur = prev;
      } else {
        cur = { header: lead, dates: { start: range.start, end: range.end }, extra: [], groups: [{ bullets: [] }], meta: after };
        out.push(cur);
      }
      lastWasBullet = false;
      continue;
    }
    // "Role, Org ⇥ Summer 2019": a tab-separated single date also opens an entry
    // single date at the end: "⇥ Summer 2019", "⇥ [ Jun'24 ]", "Title (2023)"
    const single = bullet
      ? null
      : line.match(/^(.*\S)(?:\t+\s*|\s+(?=[\[(]))[\[(]?\s*((?:(?:spring|summer|fall|autumn|winter)\s+)?[^\t\[\]()]{0,14}?(?:\b(?:19|20)\d{2}|'\d{2}))\s*[\])]?\s*$/i);
    if (single && (SINGLE_DATE.test(single[2]!) || /'\d{2}$/.test(single[2]!)) && !findRange(line)) {
      const d = single[2]!.replace(/^(spring|summer|fall|autumn|winter)\s+/i, "").trim();
      cur = { header: clean(single[1]!), dates: { start: d, end: d }, extra: [], groups: [{ bullets: [] }], meta: "" };
      out.push(cur);
      lastWasBullet = false;
      continue;
    }
    // an undated short line directly followed by a dated non-bullet line opens a new entry ("Org" ⏎ "Role ⇥ dates")
    const nextLine = all[li + 1];
    if (!bullet && nextLine && line.length < 90 && !BULLET.test(nextLine) && findRange(nextLine) && !/^[a-z(&,]/.test(line) && cur?.groups.some((g) => g.bullets.length)) {
      cur = { header: clean(line), dates: {}, extra: [], groups: [{ bullets: [] }], meta: "" };
      out.push(cur);
      lastWasBullet = false;
      continue;
    }
    if (bullet) {
      if (!cur) {
        cur = { header: "", dates: {}, extra: [], groups: [{ bullets: [] }], meta: "" };
        out.push(cur);
      }
      cur.groups[cur.groups.length - 1]!.bullets.push(clean(line.replace(BULLET, "")));
      lastWasBullet = true;
      continue;
    }
    // non-bullet, undated line
    const hasBullets = cur?.groups.some((g) => g.bullets.length);
    if (cur && lastWasBullet && /^[a-z(&,]/.test(line)) {
      // wrapped continuation of the previous bullet
      const g = cur.groups[cur.groups.length - 1]!;
      g.bullets[g.bullets.length - 1] += ` ${clean(line)}`;
      continue;
    }
    // in title-led sections (projects, activities) a non-sentence line right before a bullet starts a new entry
    if (opts.titleStarts && nextLine && BULLET.test(nextLine) && line.length <= 160 && !/[.;!]$/.test(line) && !/^[a-z(&,]/.test(line) && cur?.groups.some((g) => g.bullets.length)) {
      cur = { header: clean(line), dates: {}, extra: [], groups: [{ bullets: [] }], meta: "" };
      out.push(cur);
      lastWasBullet = false;
      continue;
    }
    const sentenceLike = line.length >= 40 && (/[.;!]$/.test(line) || line.split(/\s+/).length >= 9);
    if (cur && sentenceLike && cur.dates.start && (/[.;!]$/.test(line) || cur.extra.length >= 1 || cur.groups.some((g) => g.bullets.length))) {
      // unbulleted sentence under a dated entry (DOCX lists lose their bullet glyphs)
      cur.groups[cur.groups.length - 1]!.bullets.push(clean(line));
      lastWasBullet = true;
      continue;
    }
    if (cur && !hasBullets && cur.extra.length < 2 && line.length < 90) {
      cur.extra.push(clean(line));
      lastWasBullet = false;
      continue;
    }
    if (cur && hasBullets && line.length < 80 && !/[.;]$/.test(line) && !opts.titleStarts) {
      // a sub-heading between bullet groups
      cur.groups.push({ title: clean(line), bullets: [] });
      lastWasBullet = false;
      continue;
    }
    if (opts.titleStarts && line.length < 90) {
      cur = { header: clean(line), dates: {}, extra: [], groups: [{ bullets: [] }], meta: "" };
      out.push(cur);
      lastWasBullet = false;
      continue;
    }
    if (cur && line.length >= 40) {
      // unbulleted sentence (DOCX lists lose their bullet glyphs)
      cur.groups[cur.groups.length - 1]!.bullets.push(clean(line));
      lastWasBullet = true;
      continue;
    }
    if (!cur) {
      cur = { header: clean(line), dates: {}, extra: [], groups: [{ bullets: [] }], meta: "" };
      out.push(cur);
    } else cur.extra.push(clean(line));
  }
  for (const e of out) e.groups = e.groups.filter((g) => g.bullets.length || g.title);
  return out;
}

const typeOf = (s: string) => (s.match(TYPE_WORDS) ?? [])[0];

/**
 * Work out role / organisation / location from an entry's first line(s). Handles
 *   "Org ⇥ dates" + "Role"  ·  "Role ⇥ dates" + "Org"  ·  "Role at Org"  ·  "Role, Org"
 *   "Role | Org | Place [dates]"  ·  "Org | Role"  ·  "Org — Role"
 */
function splitHeader(header: string, next: string, leadership: boolean): { org: string; role: string; location?: string; usedExtra: boolean; orgless?: boolean } | null {
  const h = header.trim();
  if (!h && !next) return null;
  const parts = h.split(/\s+[|·•]\s+|\s+[–—]\s+/).map((x) => x.trim()).filter(Boolean);
  const nextIsMeta = !next || next.length > 90 || BULLET.test(next);
  if (parts.length >= 2) {
    const ri = parts.findIndex((x) => ROLE_WORDS.test(x));
    // "Acme Corp – Bangalore" ⇥ dates, then "Engineer" on the next line
    if (ri < 0 && !nextIsMeta) return { org: parts[0]!, role: next, location: parts.slice(1).join(", ") || undefined, usedExtra: true };
    const roleIdx = ri >= 0 ? ri : 0;
    const role = parts[roleIdx]!;
    const rest = parts.filter((_, i) => i !== roleIdx);
    return { role, org: rest[0]!, location: rest.slice(1).join(", ") || undefined, usedExtra: false };
  }
  // "Role @ Org" and the unambiguous "at" of other languages (bei, chez, på, presso, bij) need no role word;
  // English "at" does, so "Graduated at the top of class" isn't read as a job
  const atAny = h.match(/^(.+?)\s+(?:@|bei|chez|p[åa]|presso|bij|auprès de)\s+(.+)$/i);
  if (atAny && atAny[1]!.split(/\s+/).length <= 6) return { role: atAny[1]!, org: atAny[2]!, usedExtra: false };
  const at = h.match(/^(.+?)\s+at\s+(.+)$/i);
  if (at && ROLE_WORDS.test(at[1]!)) return { role: at[1]!, org: at[2]!, usedExtra: false };
  const comma = h.match(/^(.+?),\s+(.+)$/);
  if (comma && ROLE_WORDS.test(comma[1]!) && !ROLE_WORDS.test(comma[2]!)) return { role: comma[1]!, org: comma[2]!, usedExtra: false };
  if (!h) return { org: next, role: leadership ? "Member" : "Role", usedExtra: true };
  if (nextIsMeta) return { org: h, role: ROLE_WORDS.test(h) ? h : leadership ? h : "Role", usedExtra: false, ...(ROLE_WORDS.test(h) ? { orgless: true } : {}) };
  if (ROLE_WORDS.test(h) && !ROLE_WORDS.test(next)) return { role: h, org: next, usedExtra: true };
  return { org: h, role: next, usedExtra: true };
}

export type HeuristicResult = { draft: Draft; unplaced: string[] };

export function parseResumeText(text: string, extraLinks: string[] = []): HeuristicResult {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    // markdown: headings, bold/italics markers, horizontal rules
    .map((l) => l.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/\*\*|__/g, "").replace(/^\s*([-*_])\1{2,}\s*$/, ""));
  const unplaced: string[] = [];
  const sections: Record<SectionKey | "top", string[]> = { top: [], summary: [], experience: [], education: [], skills: [], projects: [], awards: [], competitions: [], certifications: [], coursework: [], leadership: [], other: [] };
  let current: SectionKey | "top" = "top";
  // Two-column layouts put two headings on one line ("EXPERIENCE ⇥ SKILLS"). Until the next heading,
  // the last tab cell of each line belongs to the right-hand section — unless it is a date, which
  // stays with its entry on the left ("Org ⇥ May 2024 – Jun 2024").
  let right: SectionKey | null = null;
  for (const l of lines) {
    const cells = l.includes("\t") ? l.split("\t") : null;
    const filled = cells?.filter((x) => x.trim()) ?? [];
    if (cells && filled.length >= 2 && filled.every((x) => isHeading(x))) {
      current = isHeading(filled[0]!)!;
      right = isHeading(filled[1]!);
      continue;
    }
    const h = isHeading(l);
    if (h) {
      current = h;
      right = null;
      continue;
    }
    if (right && cells && cells.length >= 2) {
      const last = cells[cells.length - 1]!.trim();
      if (last && !findRange(last) && !SINGLE_DATE.test(last)) {
        sections[current].push(cells.slice(0, -1).join("\t"));
        sections[right].push(last);
        continue;
      }
    }
    sections[current].push(l);
  }

  /* ---- header: name, contact, links ---- */
  const top = sections.top.map(clean).filter(Boolean);
  const all = lines.join("\n");
  const email = all.match(EMAIL)?.[0];
  const contactLine = (l: string) => EMAIL.test(l) || /phone|tel|mobile|\+\d/.test(l.toLowerCase()) || URL_RE.test(l) || /\|/.test(l);
  URL_RE.lastIndex = 0;
  // name: first header line that looks like a name once emoji/symbols, credentials and "Name:" are removed
  const asName = (l: string) =>
    l
      .split(/\t| {3,}/)[0]!
      .replace(/^name\s*[:\-]\s*/i, "")
      .replace(/[^\p{L}\p{M}.'’ ,-]/gu, " ")
      .replace(/,\s*(rn|md|phd|ph\.d\.|mba|cpa|pe|pmp|jr\.?|sr\.?|esq\.?)\b.*$/i, (m) => (/jr|sr/i.test(m) ? m : ""))
      .replace(/\s{2,}/g, " ")
      .trim();
  const nameLine = sections.top
    .map((l) => l.trim())
    .filter(Boolean)
    .find((l) => !EMAIL.test(l) && !/\d{3}/.test(l) && /\p{L}{2}/u.test(asName(l)) && asName(l).split(/\s+/).length <= 5 && asName(l).length <= 60);
  const rawName = nameLine ? asName(nameLine) : (top.find((l) => /\p{L}{2}/u.test(l)) ?? "Your Name").slice(0, 60);
  // "JORDAN BLAKE" → "Jordan Blake" (only when the whole name is in capitals)
  const name = rawName === rawName.toUpperCase() && /\p{Lu}{2}/u.test(rawName) ? rawName.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : rawName;
  const nameIdx = Math.max(0, top.findIndex((l) => nameLine !== undefined && clean(nameLine) === l));
  const headlineCand = top.slice(nameIdx + 1).find((l) => !contactLine(l) && l.length <= 120 && !findRange(l) && !/\d{3}/.test(l) && /\p{L}{3}/u.test(l));
  const phoneLine = top.find((l) => /phone|mobile|tel|\+\d/i.test(l)) ?? "";
  const phone = phoneLine.replace(EMAIL, " ").match(PHONE)?.[1]?.trim();
  const urls = new Set<string>();
  // explicit URLs anywhere; bare domains only in the header block, never the domain of an e-mail address
  const SOCIAL = /linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|medium\.com/i;
  const addUrls = (src: string, bareOk: boolean) => {
    for (const m of src.matchAll(URL_RE)) {
      const u = m[1]!.replace(/[).,]+$/, "");
      const prev = src[m.index! - 1];
      if (prev === "@" || u.includes("@")) continue;
      if (/^(https?:\/\/|www\.)/i.test(u) || SOCIAL.test(u) || (bareOk && /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/.test(u))) urls.add(u);
    }
  };
  addUrls(all, false);
  addUrls(sections.top.join("\n"), true);
  for (const u of extraLinks) if (!u.startsWith("mailto:") && !u.startsWith("tel:")) urls.add(u);
  const location = top.find((l) => /^[A-Z][\p{L} .'-]+,\s*[A-Z][\p{L} .'-]+$/u.test(l) && l !== name && l !== headlineCand);

  /* ---- summary ---- */
  const summary = clean(sections.summary.join(" ")) || undefined;

  /* ---- experience (and positions of responsibility / volunteering, as "Leadership" roles) ---- */
  const experience: DraftInput["experience"] = [];
  const addRoles = (list: Entry[], leadership: boolean) => {
    let lastOrg: string | null = null;
    for (const e of list) {
      const split = splitHeader(e.header, e.extra[0] ?? "", leadership);
      if (!split) {
        unplaced.push(e.header, ...e.groups.flatMap((g) => g.bullets));
        continue;
      }
      // a role-only line right after another role is a promotion at the same organisation:
      // "Google" ⏎ "Senior Engineer ⇥ 2022 – now" … "Engineer ⇥ 2019 – 2021"
      if (split.orgless && lastOrg) split.org = lastOrg;
      const { org, role, location, usedExtra } = split;
      lastOrg = org;
      const groups = e.groups.map((g) => ({ title: g.title, bullets: g.bullets }));
      // a sub-heading recorded as the next extra line (before any bullets) belongs to the first group
      const sub = e.extra[usedExtra ? 1 : 0];
      if (sub && groups[0] && !groups[0].title && sub !== role && sub !== org) groups[0].title = sub;
      if (!groups.length && sub && sub !== role && sub !== org) groups.push({ title: undefined, bullets: [sub] });
      const typeHint = typeOf(`${e.meta} ${e.header} ${e.extra[0] ?? ""}`);
      experience.push({
        org: org.replace(ROLE_STRIP, "").replace(/[,|]\s*$/, "").trim() || org,
        role: role.replace(ROLE_STRIP, "").replace(/[,|]\s*$/, "").trim() || role,
        type: typeHint ?? (leadership ? "Leadership" : undefined),
        location,
        start: e.dates.start,
        end: e.dates.end,
        groups,
      });
    }
  };
  addRoles(entries(sections.experience), false);
  addRoles(entries(sections.leadership, { titleStarts: true }), true);

  /* ---- education ---- */
  const education: DraftInput["education"] = [];
  for (const e of entries(sections.education)) {
    // split "Institution — Degree, Year" style headers into parts, but keep "Institute of Technology, Kharagpur" whole
    const lines = [e.header, ...e.extra, ...e.groups.flatMap((g) => g.bullets)].filter(Boolean);
    const parts = lines.flatMap((l) => (INSTITUTION.test(l) && DEGREE.test(l) ? l.split(/\s+[|–—]\s+|,\s+(?=[^,]*\b(?:university|institute|college|school|academy|b\.?\s?sc|bachelor|master|ph\.?\s?d|m\.?\s?sc|b\.?a|m\.?a|bfa|mfa|mba|diploma)\b)/i) : [l]));
    const yearOnly = (x: string) => /^\(?(19|20)\d{2}\)?$/.test(x.trim());
    const instPart = parts.find((c) => INSTITUTION.test(c) && !DEGREE.test(c)) ?? parts.find((c) => INSTITUTION.test(c)) ?? e.header;
    const degreePart = parts.find((c) => c !== instPart && DEGREE.test(c)) ?? parts.find((c) => c !== instPart && !yearOnly(c) && !SINGLE_DATE.test(c)) ?? "";
    const stripYear = (x: string) => x.replace(/,?\s*\(?((19|20)\d{2})\)?\s*$/, "").replace(/[,|]\s*$/, "").trim();
    const inst = stripYear(instPart);
    if (!/[\p{L}\p{N}]/u.test(inst)) {
      unplaced.push(...lines);
      continue;
    }
    const dateLine = lines.find((c) => SINGLE_DATE.test(c));
    education.push({
      institution: inst,
      degree: stripYear(degreePart) || "Degree",
      start: e.dates.start ?? (dateLine ? dateLine.match(SINGLE_DATE)?.[1] : undefined),
      end: e.dates.end ?? (dateLine ? [...dateLine.matchAll(new RegExp(SINGLE_DATE.source, "gi"))].pop()?.[1] : undefined),
      coursework: [],
    });
  }

  /* ---- skills: "Label: a, b, c" lines (labels may wrap onto the next line) ---- */
  const skills: DraftInput["skills"] = [];
  let last: { group?: string; items: string[] } | null = null;
  for (const raw of sections.skills) {
    const line = clean(raw.replace(BULLET, ""));
    if (!line) continue;
    const m = line.match(/^([^:]{2,40}):\s*(.+)$/);
    const split = (s: string) => s.split(/\s*[,;|•·]\s*/).map((x) => x.trim().replace(/\.$/, "")).filter((x) => x && x.length <= 48);
    if (m) {
      last = { group: m[1]!.trim(), items: split(m[2]!) };
      skills.push(last);
    } else if (last) last.items.push(...split(line));
    else {
      last = { items: split(line) };
      skills.push(last);
    }
  }
  const coursework = skills.find((g) => /coursework/i.test(g.group ?? ""));
  if (coursework && education[0]) education[0].coursework = coursework.items;
  // a dedicated Coursework section: "Label: a | b | c" lines, possibly wrapped
  const courseItems: string[] = [];
  {
    const joined: string[] = [];
    for (const raw of sections.coursework) {
      const l = clean(raw.replace(BULLET, ""));
      if (!l) continue;
      if (joined.length && !/^[^:]{2,40}:/.test(l) && /[|,;]\s*$/.test(joined[joined.length - 1]!)) joined[joined.length - 1] += ` ${l}`;
      else if (joined.length && !/^[^:]{2,40}:/.test(l) && /^[a-z(]/.test(l)) joined[joined.length - 1] += ` ${l}`;
      else joined.push(l);
    }
    for (const l of joined) {
      const body = l.replace(/^[^:]{2,40}:\s*/, "");
      const parts = /\|/.test(body) ? body.split(/\s*\|\s*/) : body.split(/\s*[,;•·]\s*/);
      for (const x of parts.map((y) => y.trim().replace(/\.$/, ""))) if (x && x.length <= 80 && !courseItems.includes(x)) courseItems.push(x);
    }
  }
  if (courseItems.length) {
    if (education[0]) education[0].coursework = [...(education[0].coursework ?? []), ...courseItems.filter((c) => !education[0]!.coursework?.includes(c))];
    else unplaced.push(...sections.coursework.map(clean).filter(Boolean));
  }

  /* ---- projects ---- */
  // a dated "Role | Org" entry is a job even when the résumé files it under Projects
  const projectEntries = entries(sections.projects, { titleStarts: true });
  const looksLikeRole = (e: Entry) => !!e.dates.start && ROLE_WORDS.test(e.header) && /\s[|·•–—]\s|\s(at|@)\s|,\s/.test(e.header) && !/\b(project|app|system|platform|model|pipeline|tool|website|dashboard|analysis)\b/i.test(e.header.split(/\s[|·•–—]\s|,\s/)[0]!);
  addRoles(projectEntries.filter(looksLikeRole), false);
  const projects: DraftInput["projects"] = projectEntries
    .filter((e) => !looksLikeRole(e))
    .filter((e) => e.header || e.groups.length)
    .map((e) => {
      const linkM = `${e.header} ${e.meta}`.match(URL_RE);
      return { title: e.header.replace(URL_RE, "").replace(/[|–—-]\s*$/, "").trim() || "Project", start: e.dates.start, link: linkM?.[0], bullets: e.groups.flatMap((g) => g.bullets) };
    });

  /* ---- competitions ---- */
  const competitions: DraftInput["competitions"] = entries(sections.competitions).map((e) => ({
    name: e.header || e.extra[0] || "Competition",
    result: e.header ? e.extra[0] : e.extra[1],
    start: e.dates.start,
    end: e.dates.end,
    bullets: e.groups.flatMap((g) => g.bullets),
  }));

  /* ---- awards & certifications ---- */
  const awardLines = (ls: string[]) => {
    const out: string[] = [];
    for (const raw of ls) {
      const l = raw.trim();
      if (!l) continue;
      if (BULLET.test(l) || !out.length) out.push(clean(l.replace(BULLET, "")));
      else if (/^[a-z(&,]/.test(l)) out[out.length - 1] += ` ${clean(l)}`;
      else out.push(clean(l));
    }
    return out;
  };
  const awards: DraftInput["awards"] = [...awardLines(sections.awards), ...awardLines(sections.certifications)].map((text) => ({ text }));

  for (const l of sections.other) if (clean(l)) unplaced.push(clean(l));

  const raw = {
    name: clean(name),
    headline: headlineCand,
    summary,
    email,
    phone,
    location,
    links: [...urls].map((url) => ({ url })),
    experience,
    education,
    skills: skills.filter((g) => (g.items ?? []).length),
    projects,
    competitions,
    awards,
  };
  // sanitise like the review screen does, so odd input can never make the parser throw
  const tidied = tidyDraft(raw as unknown as Draft);
  const draft = DraftSchema.parse({ ...tidied, name: tidied.name || "Your Name" });
  return { draft, unplaced: unplaced.filter(Boolean) };
}
