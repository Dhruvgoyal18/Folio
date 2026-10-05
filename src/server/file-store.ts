import { mkdir, readFile, rm, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import type { SiteStore, StoredSite } from "./store";

/** Node-only store for local runs: one JSON file per site under `dir` (default ./.data/sites). */
export class FileStore implements SiteStore {
  constructor(private dir = join(process.cwd(), ".data", "sites")) {}
  private file(slug: string) {
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) throw new Error("bad slug");
    return join(this.dir, `${slug}.json`);
  }
  async get(slug: string) {
    try {
      return JSON.parse(await readFile(this.file(slug), "utf8")) as StoredSite;
    } catch {
      return null;
    }
  }
  async put(slug: string, site: StoredSite) {
    await mkdir(this.dir, { recursive: true });
    const tmp = `${this.file(slug)}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(site));
    await rename(tmp, this.file(slug));
  }
  async delete(slug: string) {
    await rm(this.file(slug), { force: true });
  }
}
