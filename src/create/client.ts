import type { Draft } from "@/extract/draft";
import type { Genome } from "@/genome/schema";

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; issues?: string[]; suggestion?: string };
  if (!res.ok) {
    const err = new Error(body.error ?? `Request failed (${res.status})`) as Error & { status: number; issues?: string[]; suggestion?: string };
    err.status = res.status;
    err.issues = body.issues;
    err.suggestion = body.suggestion;
    throw err;
  }
  return body;
}

export type ExtractResult = { draft: Draft; unplaced: string[]; mode: "llm" | "rules" };
export const extract = (text: string, links: string[]) => call<ExtractResult>("/api/extract", { method: "POST", body: JSON.stringify({ text, links }) });

export const checkSlug = (name: string) => call<{ slug: string; available: boolean; suggestion: string }>(`/api/slug?name=${encodeURIComponent(name)}`);

export type Published = { slug: string; url: string; editToken: string; editUrl: string; notes: string[] };
export const publish = (draft: Draft, genome: Genome, slug: string) => call<Published>("/api/sites", { method: "POST", body: JSON.stringify({ draft, genome, slug }) });

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
export const loadForEdit = (slug: string, token: string) =>
  call<{ slug: string; draft: Draft; genome: Genome; updatedAt: string }>(`/api/sites/${encodeURIComponent(slug)}/edit`, { headers: auth(token) });
export const saveEdit = (slug: string, token: string, draft: Draft, genome: Genome) =>
  call<{ slug: string; url: string; updatedAt: string; notes: string[] }>(`/api/sites/${encodeURIComponent(slug)}`, { method: "PUT", headers: auth(token), body: JSON.stringify({ draft, genome }) });
export const deleteSite = (slug: string, token: string) => call<{ deleted: string }>(`/api/sites/${encodeURIComponent(slug)}`, { method: "DELETE", headers: auth(token) });
