import type { Resume } from "@/data/schema";
import { citeTargets, firstName } from "@/lib/resume";
import { detectInjection, detectOffTopic, refusalInjection, refusalOffTopic, validateChat, LIMITS } from "./guard";
import { CANARY, systemPrompt } from "./prompt";
import { answerFromResume } from "./retrieval";
import { MemoryRateLimiter } from "./ratelimit";

/**
 * Runtime-agnostic chat endpoint (Cloudflare Pages Function, Node dev server, tests).
 * Request:  POST /api/chat?site=<slug> { messages: [{ role, content }] }
 * Response: text/event-stream of JSON events
 *   {type:"meta", mode:"llm"|"retrieval"|"guard"}
 *   {type:"delta", text}          — streamed answer text
 *   {type:"replace", text}        — server withdrew the streamed text (leak guard)
 *   {type:"cite", ids:[...]}      — validated section ids
 *   {type:"done"} | {type:"error", message}
 */

export type ChatEnv = {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  CHAT_RATE_PER_MIN?: string;
  CHAT_RATE_PER_DAY?: string;
  /** daily cap per site (protects the owner's/platform's API budget from one viral page) */
  CHAT_SITE_PER_DAY?: string;
  /** Cloudflare Rate Limiting binding (optional) */
  RATE_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
};

export type ChatTarget = { resume: Resume; assistant?: string };

export type ChatDeps = {
  fetch?: typeof fetch;
  limiter?: MemoryRateLimiter;
  siteLimiter?: MemoryRateLimiter;
  /** fixed resume (tests, single-site deployments) */
  resume?: Resume;
  assistant?: string;
  /** multi-tenant: resolve ?site=<slug> to its resume */
  loadSite?: (slug: string) => Promise<ChatTarget | null>;
};

const DEFAULT_MODEL = "claude-haiku-4-5";
let sharedLimiter: MemoryRateLimiter | null = null;
let sharedSiteLimiter: MemoryRateLimiter | null = null;

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

export async function handleChat(req: Request, env: ChatEnv, deps: ChatDeps = {}): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, { allow: "POST" });

  // Same-origin by default; extra origins via ALLOWED_ORIGINS (comma-separated).
  const origin = req.headers.get("origin");
  if (origin) {
    const self = new URL(req.url).origin;
    const allowed = new Set([self, ...(env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)]);
    if (!allowed.has(origin)) return json(403, { error: "Origin not allowed" });
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > LIMITS.bodyBytes) return json(413, { error: "Request too large." });

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json(429, { error: "Too many questions — try again in a minute." }, { "retry-after": "60" });
  }
  const limiter =
    deps.limiter ??
    (sharedLimiter ??= new MemoryRateLimiter(Number(env.CHAT_RATE_PER_MIN ?? 8), Number(env.CHAT_RATE_PER_DAY ?? 80)));
  const rl = limiter.check(ip);
  if (!rl.ok) return json(429, { error: "Too many questions — try again shortly.", retryAfter: rl.retryAfter }, { "retry-after": String(rl.retryAfter) });

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > LIMITS.bodyBytes) return json(413, { error: "Request too large." });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Malformed request." });
  }
  const v = validateChat(body);
  if (!v.ok) return json(v.status, { error: v.error });

  // Which resume? ?site=<slug> on the platform, or a fixed resume for single-site use.
  const slug = new URL(req.url).searchParams.get("site");
  let target: ChatTarget | null = null;
  if (slug && deps.loadSite) {
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) return json(400, { error: "Unknown site." });
    target = await deps.loadSite(slug);
  } else if (deps.resume) target = { resume: deps.resume, assistant: deps.assistant };
  if (!target) return json(404, { error: "Unknown site." });
  const r = target.resume;
  const assistant = target.assistant ?? "CAPCOM";
  const first = firstName(r);

  const siteLimiter = deps.siteLimiter ?? (sharedSiteLimiter ??= new MemoryRateLimiter(10_000, Number(env.CHAT_SITE_PER_DAY ?? 300)));
  const sl = siteLimiter.check(`site:${slug ?? "default"}`);
  if (!sl.ok) return json(429, { error: `${assistant} has answered a lot of questions today — please try again tomorrow, or use the contact links.` }, { "retry-after": String(sl.retryAfter) });

  const validIds = new Set(citeTargets(r).map((c) => c.id));
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const w = writable.getWriter();
  const send = (o: unknown) => w.write(enc.encode(sse(o)));

  const run = async () => {
    try {
      if (detectInjection(v.question)) {
        await send({ type: "meta", mode: "guard" });
        await send({ type: "delta", text: refusalInjection(first) });
        await send({ type: "cite", ids: [] });
        return;
      }
      if (detectOffTopic(v.question)) {
        await send({ type: "meta", mode: "guard" });
        await send({ type: "delta", text: refusalOffTopic(first) });
        await send({ type: "cite", ids: [] });
        return;
      }
      if (!env.ANTHROPIC_API_KEY) {
        await offline(send, r, v.question, validIds);
        return;
      }
      const ok = await streamClaude(send, env, deps.fetch ?? fetch, r, assistant, v.messages, validIds);
      if (!ok) await offline(send, r, v.question, validIds, true);
    } catch (err) {
      await send({ type: "error", message: `${assistant} lost signal. Please try again.` });
      console.error("chat error", err);
    } finally {
      await send({ type: "done" });
      await w.close();
    }
  };
  // Cloudflare keeps the isolate alive while the stream is open.
  void run();

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function offline(send: (o: unknown) => Promise<void>, r: Resume, q: string, validIds: Set<string>, degraded = false) {
  await send({ type: "meta", mode: "retrieval", degraded });
  const a = answerFromResume(r, q);
  await send({ type: "delta", text: a.text });
  await send({ type: "cite", ids: a.cites.filter((id) => validIds.has(id)) });
}

/** Holds back text after "SOURCES:" (and partial prefixes of it) so citations never stream as prose. */
export class CitationSplitter {
  private buf = "";
  private emitted = 0;
  private sourcesAt = -1;
  static MARK = "SOURCES:";

  push(chunk: string): string {
    this.buf += chunk;
    if (this.sourcesAt < 0) {
      const i = this.buf.indexOf(CitationSplitter.MARK);
      if (i >= 0) this.sourcesAt = i;
    }
    const limit = this.sourcesAt >= 0 ? this.sourcesAt : Math.max(this.emitted, this.buf.length - CitationSplitter.MARK.length);
    const out = this.buf.slice(this.emitted, limit);
    this.emitted = Math.max(this.emitted, limit);
    return out;
  }
  /** Remaining answer text (if no SOURCES line was produced). */
  flush(): string {
    if (this.sourcesAt >= 0) return "";
    const out = this.buf.slice(this.emitted);
    this.emitted = this.buf.length;
    return out;
  }
  get full() {
    return this.buf;
  }
  answer(): string {
    return (this.sourcesAt >= 0 ? this.buf.slice(0, this.sourcesAt) : this.buf).trim();
  }
  ids(valid: Set<string>): string[] {
    if (this.sourcesAt < 0) return [];
    return this.buf
      .slice(this.sourcesAt + CitationSplitter.MARK.length)
      .split(/[,\s]+/)
      .map((s) => s.replace(/[[\]().]/g, "").trim())
      .filter((s) => valid.has(s))
      .slice(0, 4);
  }
}

/** Signals that the model may be echoing its instructions. */
export function looksLikeLeak(text: string): boolean {
  if (text.includes(CANARY)) return true;
  const probes = ["Rules (permanent", "Internal marker", "never output it", "RESUME block below", "<resume>"];
  return probes.some((p) => text.includes(p));
}

async function streamClaude(
  send: (o: unknown) => Promise<void>,
  env: ChatEnv,
  doFetch: typeof fetch,
  r: Resume,
  assistant: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  validIds: Set<string>,
): Promise<boolean> {
  const res = await doFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 450,
      temperature: 0.2,
      stream: true,
      system: [{ type: "text", text: systemPrompt(r, assistant), cache_control: { type: "ephemeral" } }],
      messages,
    }),
  }).catch(() => null);

  if (!res || !res.ok || !res.body) {
    console.error("anthropic upstream", res?.status);
    return false;
  }
  await send({ type: "meta", mode: "llm" });

  const split = new CitationSplitter();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  let leaked = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += value;
    let nl: number;
    while ((nl = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, nl).trim();
      pending = pending.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      let ev: { type?: string; delta?: { type?: string; text?: string } };
      try {
        ev = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
        const out = split.push(ev.delta.text);
        if (looksLikeLeak(split.full)) {
          leaked = true;
          break;
        }
        if (out) await send({ type: "delta", text: out });
      }
    }
    if (leaked) break;
  }
  if (leaked) {
    await reader.cancel().catch(() => {});
    await send({ type: "replace", text: refusalInjection(firstName(r)) });
    await send({ type: "cite", ids: [] });
    return true;
  }
  const rest = split.flush();
  if (rest) await send({ type: "delta", text: rest });
  await send({ type: "cite", ids: split.ids(validIds) });
  return true;
}
