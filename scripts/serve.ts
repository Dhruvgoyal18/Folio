/**
 * Local production-like server, mirroring the Cloudflare deployment:
 *   /api/*        → the same router the Pages Function uses (extract, sites, slug, chat)
 *   /u/<slug>     → published sites: the /site shell with the site injected (else static files)
 *   /             → landing page, or HOME_SITE's site when that env var is set
 *   everything else → the static export in ./out
 *   npm run build && npm run serve        → http://localhost:4173
 * Sites are stored as JSON files in ./.data/sites (SITES_DIR to change; SITES_STORE=memory for tests).
 * ANTHROPIC_API_KEY enables Claude for extraction and chat; without it both run rule-based/offline.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { handleApi, renderSitePage } from "../src/server/api";
import { FileStore } from "../src/server/file-store";
import { MemoryStore, type SiteStore } from "../src/server/store";

const store: SiteStore = process.env.SITES_STORE === "memory" ? new MemoryStore() : new FileStore(process.env.SITES_DIR);
const env = process.env as Record<string, string>;
let shellCache: { html: string; mtime: number } | null = null;
const compressed = new Map<string, Buffer>();

/** Mirror Cloudflare's `_headers` file (path globs → headers) so local behaviour matches production. */
type Rule = { re: RegExp; headers: Record<string, string> };
let rulesCache: { rules: Rule[]; mtime: number } | null = null;
async function headerRules(): Promise<Rule[]> {
  const file = join(process.cwd(), "out", "_headers");
  try {
    const mtime = (await stat(file)).mtimeMs;
    if (rulesCache?.mtime === mtime) return rulesCache.rules;
    const rules: Rule[] = [];
    let cur: Rule | null = null;
    for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      if (!/^\s/.test(line)) {
        cur = { re: new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`), headers: {} };
        rules.push(cur);
      } else if (cur) {
        const i = line.indexOf(":");
        if (i > 0) cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
    rulesCache = { rules, mtime };
    return rules;
  } catch {
    return [];
  }
}
async function headersFor(path: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const r of await headerRules()) if (r.re.test(path)) Object.assign(out, r.headers);
  return out;
}
const siteShell = async () => {
  const file = join(process.cwd(), "out", "site.html");
  const mtime = (await stat(file)).mtimeMs;
  if (!shellCache || shellCache.mtime !== mtime) shellCache = { html: await readFile(file, "utf8"), mtime };
  return shellCache.html;
};

const root = join(process.cwd(), "out");
const port = Number(process.env.PORT ?? 4173);
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".txt": "text/plain", ".ico": "image/x-icon", ".webp": "image/webp",
};

async function file(path: string) {
  try {
    const s = await stat(path);
    if (s.isFile()) return path;
  } catch {}
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const request = new Request(url, {
      method: req.method,
      headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
      body: req.method === "POST" || req.method === "PUT" ? Buffer.concat(chunks) : undefined,
    });
    const response = await handleApi(request, env, { store });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    return res.end();
  }
  const u = url.pathname.match(/^\/u\/([a-z0-9-]{1,64})\/?$/);
  const homeSlug = url.pathname === "/" ? env.HOME_SITE : undefined;
  if ((u && (await store.get(u[1]!))) || (homeSlug && (await store.get(homeSlug)))) {
    const page = await renderSitePage((u?.[1] ?? homeSlug)!, await siteShell(), store, url.origin);
    if (page) {
      res.writeHead(page.status, { ...(await headersFor(url.pathname)), ...Object.fromEntries(page.headers) });
      return res.end(await page.text());
    }
  }
  if (homeSlug) url.pathname = `/u/${homeSlug}`;
  const clean = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidates = [join(root, clean), join(root, clean, "index.html"), join(root, `${clean}.html`)];
  let hit: string | null = null;
  for (const c of candidates) if ((hit = await file(c))) break;
  if (!hit) {
    res.writeHead(404, { "content-type": "text/html" });
    return res.end(await readFile(join(root, "404.html")).catch(() => "Not found"));
  }
  const ext = extname(hit);
  let body: Buffer = await readFile(hit);
  const headers: Record<string, string> = {
    "content-type": types[ext] ?? "application/octet-stream",
    "cache-control": hit.includes("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
  };
  // Mirror Cloudflare's edge compression so local Lighthouse numbers are representative.
  // (compressed once per file and cached, like a CDN — compressing per request would make the server the bottleneck)
  const accept = String(req.headers["accept-encoding"] ?? "");
  if ([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt"].includes(ext)) {
    const enc = accept.includes("br") ? "br" : accept.includes("gzip") ? "gzip" : null;
    if (enc) {
      const st = await stat(hit);
      const key = `${enc}:${hit}:${st.mtimeMs}:${st.size}`; // a rebuild (new mtime) invalidates the cache
      let z = compressed.get(key);
      if (!z) compressed.set(key, (z = enc === "br" ? brotliCompressSync(body) : gzipSync(body)));
      body = z;
      headers["content-encoding"] = enc;
    }
    headers.vary = "accept-encoding";
  }
  res.writeHead(200, { ...(await headersFor(url.pathname)), ...headers });
  res.end(body);
}).listen(port, () => {
  console.log(`Folio → http://localhost:${port}  (store: ${process.env.SITES_STORE === "memory" ? "memory" : "files"}${env.HOME_SITE ? `, home: /u/${env.HOME_SITE}` : ""})`);
  console.log(`  extraction + chat: ${env.ANTHROPIC_API_KEY ? "Claude" : "rule-based / offline retrieval"}`);
});
