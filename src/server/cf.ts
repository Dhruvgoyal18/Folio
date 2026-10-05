/// <reference types="@cloudflare/workers-types" />
import { KVStore, MemoryStore, type SiteStore } from "./store";
import type { ApiEnv } from "./api";

export type Env = ApiEnv & { SITES?: KVNamespace; HOME_SITE?: string; ASSETS: Fetcher };

let fallback: MemoryStore | null = null;
/** KV in production; without the binding (first deploy, previews) sites live in isolate memory only. */
export function storeFor(env: Env): SiteStore {
  if (env.SITES) return new KVStore(env.SITES as unknown as ConstructorParameters<typeof KVStore>[0]);
  return (fallback ??= new MemoryStore());
}

export async function shell(env: Env, req: Request): Promise<string> {
  const res = await env.ASSETS.fetch(new URL("/site", req.url).toString());
  return res.text();
}
