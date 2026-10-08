import type { SiteData } from "@/site/model";
import type { Draft } from "@/extract/draft";

/** A published site as stored (never sent to visitors: carries the edit-token hash). */
export type StoredSite = SiteData & {
  /** the reviewed draft the resume was normalised from — reloaded by the editor */
  draft: Draft;
  editTokenHash: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export interface SiteStore {
  get(slug: string): Promise<StoredSite | null>;
  put(slug: string, site: StoredSite): Promise<void>;
  delete(slug: string): Promise<void>;
}

/** Cloudflare KV (binding `SITES`). One key per site: `site:<slug>`. */
export type KVLike = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};
export class KVStore implements SiteStore {
  constructor(private kv: KVLike) {}
  async get(slug: string) {
    return ((await this.kv.get(`site:${slug}`, "json")) as StoredSite | null) ?? null;
  }
  async put(slug: string, site: StoredSite) {
    await this.kv.put(`site:${slug}`, JSON.stringify(site));
  }
  async delete(slug: string) {
    await this.kv.delete(`site:${slug}`);
  }
}

/** In-memory store (tests, ephemeral previews). */
export class MemoryStore implements SiteStore {
  private m = new Map<string, string>();
  async get(slug: string) {
    const v = this.m.get(slug);
    return v ? (JSON.parse(v) as StoredSite) : null;
  }
  async put(slug: string, site: StoredSite) {
    this.m.set(slug, JSON.stringify(site));
  }
  async delete(slug: string) {
    this.m.delete(slug);
  }
}

/** Public view of a stored site. */
export function publicSite(s: StoredSite): SiteData {
  return { slug: s.slug, resume: s.resume, genome: s.genome, graph: s.graph, ...(s.custom ? { custom: s.custom } : {}), updatedAt: s.updatedAt };
}
