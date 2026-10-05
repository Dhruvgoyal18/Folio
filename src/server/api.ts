import { DraftSchema, tidyDraft } from "@/extract/draft";
import { parseResumeText } from "@/extract/heuristic";
import { extractWithClaude } from "@/extract/llm";
import { normalize } from "@/extract/normalize";
import { validateGenome } from "@/genome/validate";
import { computeSkillGraph } from "@/lib/skill-graph";
import { handleChat, type ChatEnv } from "@/chat/handler";
import { MemoryRateLimiter } from "@/chat/ratelimit";
import type { SiteData } from "@/site/model";
import { bearer, hashToken, newToken, verifyToken } from "./auth";
import { builtinSite } from "./builtins";
import { SHOWCASE_SLUG } from "@/site/showcase";
import { injectSite } from "./render";
import { isValidSlug, slugify, uniqueSlug } from "./slug";
import { publicSite, type SiteStore, type StoredSite } from "./store";

/**
 * Platform API — one runtime-agnostic router used by the Cloudflare Pages Function and the
 * Node server alike.
 *
 *   POST   /api/extract              { text, links? }        → { draft, unplaced, mode }
 *   GET    /api/slug?name=…          availability check      → { slug, available, suggestion }
 *   POST   /api/sites                { draft, genome, slug? } → { slug, url, editToken, editUrl }
 *   GET    /api/sites/:slug          public site JSON
 *   GET    /api/sites/:slug/edit     (Bearer token) draft + genome for the editor
 *   PUT    /api/sites/:slug          (Bearer token) { draft, genome }
 *   DELETE /api/sites/:slug          (Bearer token)
 *   POST   /api/chat?site=:slug      the résumé assistant
 *
 * The server never trusts client-derived data: the résumé is re-normalised from the draft,
 * the genome is schema- and contrast-checked, and the skill-graph layout is computed here.
 */

export type ApiEnv = ChatEnv & {
  HOME_SITE?: string;
  ANTHROPIC_EXTRACT_MODEL?: string;
  EXTRACT_RATE_PER_MIN?: string;
  CREATE_RATE_PER_MIN?: string;
  CREATE_RATE_PER_DAY?: string;
};

export type ApiDeps = {
  store: SiteStore;
  fetch?: typeof fetch;
  limiters?: Partial<Record<"extract" | "create" | "write", MemoryRateLimiter>>;
  now?: () => Date;
};

export const BODY_LIMIT = 256 * 1024;
export const TEXT_LIMIT = 40_000;

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

const shared: Partial<Record<"extract" | "create" | "write", MemoryRateLimiter>> = {};
function limiter(deps: ApiDeps, env: ApiEnv, kind: "extract" | "create" | "write"): MemoryRateLimiter {
  if (deps.limiters?.[kind]) return deps.limiters[kind]!;
  return (shared[kind] ??=
    kind === "extract"
      ? new MemoryRateLimiter(Number(env.EXTRACT_RATE_PER_MIN ?? 6), 60)
      : kind === "create"
        ? new MemoryRateLimiter(Number(env.CREATE_RATE_PER_MIN ?? 3), Number(env.CREATE_RATE_PER_DAY ?? 20))
        : new MemoryRateLimiter(30, 500));
}

const ipOf = (req: Request) => req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";

async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; res: Response }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > BODY_LIMIT) return { ok: false, res: json(413, { error: "Request too large." }) };
  const raw = await req.text();
  if (raw.length > BODY_LIMIT) return { ok: false, res: json(413, { error: "Request too large." }) };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: json(400, { error: "Malformed JSON." }) };
  }
}

function sameOrigin(req: Request, env: ApiEnv): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const self = new URL(req.url).origin;
  return origin === self || (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).includes(origin);
}

/** Load a site for rendering or chat: the store first, then built-ins (the showcase). */
export async function loadSite(store: SiteStore, slug: string): Promise<SiteData | null> {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const s = await store.get(slug).catch(() => null);
  if (s) return publicSite(s);
  return builtinSite(slug);
}

/** Validate a publish/update payload into a ready-to-store site (minus token/timestamps). */
function buildSite(body: unknown, slug: string): { ok: true; site: Omit<StoredSite, "editTokenHash" | "createdAt" | "updatedAt" | "version">; notes: string[] } | { ok: false; res: Response } {
  const b = body as { draft?: unknown; genome?: unknown } | null;
  const first = DraftSchema.safeParse(b?.draft);
  // same clean-up the studio applies, so a hand-built API call gets identical treatment
  const d = first.success ? DraftSchema.safeParse(tidyDraft(first.data)) : first;
  if (!d.success) return { ok: false, res: json(422, { error: "The résumé is incomplete.", issues: d.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`) }) };
  if (JSON.stringify(d.data).length > TEXT_LIMIT * 2) return { ok: false, res: json(413, { error: "The résumé is too long." }) };
  let resume;
  let notes: string[];
  try {
    ({ resume, notes } = normalize(d.data, "upload"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, res: json(422, { error: "The résumé couldn't be validated.", issues: [msg.slice(0, 400)] }) };
  }
  const g = validateGenome(b?.genome);
  if (!g.ok) return { ok: false, res: json(422, { error: "The design is invalid.", issues: g.issues.slice(0, 8) }) };
  return { ok: true, site: { slug, draft: d.data, resume, genome: g.genome, graph: computeSkillGraph(resume) }, notes: [...notes, ...g.repaired] };
}

export async function handleApi(req: Request, env: ApiEnv, deps: ApiDeps): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method.toUpperCase();
  const now = () => (deps.now?.() ?? new Date()).toISOString();
  if (method === "OPTIONS") return new Response(null, { status: 204 });

  if (path === "/api/chat") {
    // no ?site= → the deployment's home site (or the showcase)
    if (!url.searchParams.get("site")) {
      url.searchParams.set("site", env.HOME_SITE || SHOWCASE_SLUG);
      req = new Request(url, req);
    }
    return handleChat(req, env, {
      fetch: deps.fetch,
      loadSite: async (slug) => {
        const s = await loadSite(deps.store, slug);
        return s ? { resume: s.resume, assistant: s.genome.copy.assistant } : null;
      },
    });
  }

  if (method !== "GET" && !sameOrigin(req, env)) return json(403, { error: "Origin not allowed." });
  const ip = ipOf(req);

  /* ---- extraction ---- */
  if (path === "/api/extract") {
    if (method !== "POST") return json(405, { error: "Method not allowed" }, { allow: "POST" });
    const rl = limiter(deps, env, "extract").check(ip);
    if (!rl.ok) return json(429, { error: "Too many uploads — try again in a minute.", retryAfter: rl.retryAfter }, { "retry-after": String(rl.retryAfter) });
    const r = await readJson(req);
    if (!r.ok) return r.res;
    const b = r.body as { text?: unknown; links?: unknown };
    if (typeof b?.text !== "string" || b.text.trim().length < 40) return json(422, { error: "We couldn't find enough text in that file. Try a text-based PDF or DOCX, or paste your résumé." });
    const text = b.text.slice(0, TEXT_LIMIT);
    const links = Array.isArray(b.links) ? b.links.filter((l): l is string => typeof l === "string" && l.length < 300).slice(0, 30) : [];
    const rules = parseResumeText(text, links);
    const llm = await extractWithClaude(text, links, env, deps.fetch).catch(() => null);
    if (llm && llm.experience.length + llm.education.length >= rules.draft.experience.length + rules.draft.education.length) {
      return json(200, { draft: llm, unplaced: [], mode: "llm" });
    }
    return json(200, { draft: rules.draft, unplaced: rules.unplaced, mode: "rules" });
  }

  /* ---- slug availability ---- */
  if (path === "/api/slug") {
    const name = (url.searchParams.get("name") ?? "").slice(0, 80);
    const wanted = slugify(name);
    const taken = async (s: string) => !!(await loadSite(deps.store, s));
    const available = isValidSlug(wanted) && !(await taken(wanted));
    return json(200, { slug: wanted, available, suggestion: available ? wanted : await uniqueSlug(wanted, taken) });
  }

  /* ---- sites ---- */
  if (path === "/api/sites") {
    if (method !== "POST") return json(405, { error: "Method not allowed" }, { allow: "POST" });
    const rl = limiter(deps, env, "create").check(ip);
    if (!rl.ok) return json(429, { error: "You've published several sites recently — try again later.", retryAfter: rl.retryAfter }, { "retry-after": String(rl.retryAfter) });
    const r = await readJson(req);
    if (!r.ok) return r.res;
    const b = r.body as { draft?: { name?: string }; slug?: unknown };
    const taken = async (s: string) => !!(await loadSite(deps.store, s));
    let slug: string;
    if (typeof b?.slug === "string" && b.slug) {
      if (!isValidSlug(b.slug)) return json(422, { error: "That address isn't allowed. Use 3–40 lowercase letters, numbers and dashes." });
      if (await taken(b.slug)) return json(409, { error: "That address is taken.", suggestion: await uniqueSlug(b.slug, taken) });
      slug = b.slug;
    } else slug = await uniqueSlug(slugify(String(b?.draft?.name ?? "folio")), taken);
    const built = buildSite(r.body, slug);
    if (!built.ok) return built.res;
    const token = newToken();
    const t = now();
    await deps.store.put(slug, { ...built.site, editTokenHash: await hashToken(token), createdAt: t, updatedAt: t, version: 1 });
    return json(201, { slug, url: `/u/${slug}`, editToken: token, editUrl: `/create?edit=${slug}#token=${token}`, notes: built.notes });
  }

  const m = path.match(/^\/api\/sites\/([^/]+)(\/edit)?$/);
  if (m) {
    const slug = decodeURIComponent(m[1]!);
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) return json(404, { error: "Not found." });
    if (method === "GET" && !m[2]) {
      const s = await loadSite(deps.store, slug);
      return s ? json(200, s) : json(404, { error: "Not found." });
    }
    // everything else needs the owner's token
    const stored = await deps.store.get(slug);
    if (!stored) return json(404, { error: "Not found." });
    const rl = limiter(deps, env, "write").check(ip);
    if (!rl.ok) return json(429, { error: "Too many requests." }, { "retry-after": String(rl.retryAfter) });
    if (!(await verifyToken(bearer(req), stored.editTokenHash))) return json(401, { error: "This edit link isn't valid for that site." }, { "www-authenticate": "Bearer" });
    if (method === "GET" && m[2]) return json(200, { slug, draft: stored.draft, genome: stored.genome, updatedAt: stored.updatedAt, version: stored.version });
    if (m[2]) return json(405, { error: "Method not allowed" }, { allow: "GET" });
    if (method === "PUT") {
      const r = await readJson(req);
      if (!r.ok) return r.res;
      const built = buildSite(r.body, slug);
      if (!built.ok) return built.res;
      const t = now();
      await deps.store.put(slug, { ...built.site, editTokenHash: stored.editTokenHash, createdAt: stored.createdAt, updatedAt: t, version: stored.version + 1 });
      return json(200, { slug, url: `/u/${slug}`, updatedAt: t, version: stored.version + 1, notes: built.notes });
    }
    if (method === "DELETE") {
      await deps.store.delete(slug);
      return json(200, { deleted: slug });
    }
    return json(405, { error: "Method not allowed" }, { allow: "GET, PUT, DELETE" });
  }

  return json(404, { error: "Not found." });
}

/** /u/:slug — the static site shell with the person's data and genome injected. */
export async function renderSitePage(slug: string, shell: string, store: SiteStore, origin?: string): Promise<Response | null> {
  const site = await loadSite(store, slug);
  if (!site) return null;
  const html = injectSite(shell, site, { canonical: origin ? `${origin}/u/${slug}` : undefined });
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate", "x-content-type-options": "nosniff" } });
}
