import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { seedResume } from "@/data/seed";
import { applyCustom, customOrder, metricChoices, type Custom } from "@/lib/customize";
import { CustomSchema } from "@/lib/custom-schema";
import { kpis } from "@/lib/resume";
import { buildModel } from "@/site/model";
import { generateGenome, chapterOrder } from "@/genome/generate";
import { computeSkillGraph } from "@/lib/skill-graph";
import { handleApi, loadSite } from "@/server/api";
import { MemoryStore } from "@/server/store";
import { MemoryRateLimiter } from "@/chat/ratelimit";
import { parseResumeText } from "@/extract/heuristic";
import { normalize } from "@/extract/normalize";
import { DraftSchema } from "@/extract/draft";

const r = seedResume;
const genome = generateGenome(r, { seed: 3, concept: "minimal" });

describe("featured numbers", () => {
  const all = metricChoices(r);
  it("lists every number in the résumé with a stable reference", () => {
    expect(all.length).toBeGreaterThan(10);
    expect(new Set(all.map((m) => m.ref)).size).toBe(all.length);
    expect(all.filter((m) => m.auto).length).toBe(kpis(r).length);
  });
  it("picks, orders, relabels and annotates the owner's choices", () => {
    const leads = all.find((m) => m.display === "400k+")!;
    const f1 = all.find((m) => m.display === "+27%")!;
    const out = applyCustom(r, { hidden: [], kpis: [{ ref: f1.ref, label: "Better F1 on held-out images", note: "5-fold LOIO" }, { ref: leads.ref }] });
    const k = kpis(out);
    expect(k.map((x) => x.value)).toEqual([27, 400]);
    expect(k[0]!.label).toBe("Better F1 on held-out images");
    expect(k[0]!.note).toBe("5-fold LOIO");
    expect(k[1]!.label).toBe(leads.label);
  });
  it("falls back to the automatic picks when every reference is stale", () => {
    const out = applyCustom(r, { hidden: [], kpis: [{ ref: "gone:0" }] });
    expect(kpis(out).map((x) => x.value)).toEqual(kpis(r).map((x) => x.value));
  });
  it("never invents numbers: only values printed in bullets can be featured", () => {
    const out = applyCustom(r, { hidden: [], kpis: all.slice(0, 6).map((m) => ({ ref: m.ref, label: "x" })) });
    for (const k of kpis(out)) expect(k.sourceText).toContain(String(k.value).replace(/\.0$/, ""));
  });
});

describe("case files", () => {
  const ids = r.projects.map((p) => p.id);
  it("renames, rewrites, hides and reorders", () => {
    const out = applyCustom(r, { hidden: [], projects: [{ id: ids[2]! }, { id: ids[0]!, title: "Text-to-SQL for analysts", summary: "My words." }, { id: ids[1]!, hidden: true }] });
    expect(out.projects.map((p) => p.id).slice(0, 2)).toEqual([ids[2], ids[0]]);
    expect(out.projects.find((p) => p.id === ids[1])).toBeUndefined();
    const edited = out.projects.find((p) => p.id === ids[0])!;
    expect(edited.title).toBe("Text-to-SQL for analysts");
    expect(edited.summary).toBe("My words.");
    expect(edited.derived).toBe(false);
    expect(out.projects.length).toBe(r.projects.length - 1);
  });
  it("won't hide every case file", () => {
    const out = applyCustom(r, { hidden: [], projects: ids.map((id) => ({ id, hidden: true })) });
    expect(out.projects.length).toBe(r.projects.length);
  });
  it("leaves the original untouched (pure)", () => {
    const before = JSON.stringify(r);
    applyCustom(r, { hidden: [], projects: [{ id: ids[0]!, title: "T" }] });
    expect(JSON.stringify(r)).toBe(before);
  });
});

describe("chapters", () => {
  const base = chapterOrder(genome);
  it("hides and reorders, contact always last and never hidden", () => {
    const c: Custom = { hidden: ["payload"], order: ["missions", "telemetry", "comms", "trajectory"] };
    expect(customOrder(base, c)).toEqual(["missions", "telemetry", "trajectory", "training", "comms"].filter((s) => s !== "payload"));
    const m = buildModel({ slug: "t", resume: r, genome, graph: computeSkillGraph(r), custom: c });
    expect(m.chapters.map((x) => x.id)).toEqual(["launch", "missions", "telemetry", "trajectory", "training", "comms"]);
  });
  it("ignores unknown or duplicate ids", () => {
    expect(customOrder(base, { hidden: [], order: ["missions", "missions", "nope" as never] })[0]).toBe("missions");
  });
});

describe("validation", () => {
  it("accepts an empty object and rejects hiding contact, too many numbers and overlong text", () => {
    expect(CustomSchema.parse(undefined)).toEqual({ hidden: [] });
    expect(CustomSchema.safeParse({ hidden: ["comms"] }).success).toBe(false);
    expect(CustomSchema.safeParse({ hidden: [], kpis: Array.from({ length: 7 }, (_, i) => ({ ref: `h:${i}` })) }).success).toBe(false);
    expect(CustomSchema.safeParse({ hidden: [], projects: [{ id: "p", title: "x".repeat(91) }] }).success).toBe(false);
  });
});

describe("API: customisations are stored, applied and editable", () => {
  const SAMPLE = readFileSync("public/samples/maya-chen.txt", "utf8");
  const draft = parseResumeText(SAMPLE).draft;
  const resume = normalize(DraftSchema.parse(draft)).resume;
  const g = generateGenome(resume, { seed: 4, concept: "aurora" });
  const deps = () => ({ store: new MemoryStore(), limiters: { extract: new MemoryRateLimiter(100, 1000), create: new MemoryRateLimiter(100, 1000), write: new MemoryRateLimiter(100, 1000) } });
  const req = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

  it("publishes with choices, serves them, returns them for editing, and updates them", async () => {
    const d = deps();
    const m = metricChoices(resume);
    const custom = { hidden: ["payload"], order: ["missions"], kpis: [{ ref: m[0]!.ref, label: "Owner label" }, { ref: m[1]!.ref }], projects: [{ id: resume.projects[0]!.id, title: "Owner title" }] };
    const res = await handleApi(req("POST", "/api/sites", { draft, genome: g, slug: "maya-custom", custom }), {}, d);
    expect(res.status).toBe(201);
    const { editToken } = (await res.json()) as { editToken: string };
    const site = (await loadSite(d.store, "maya-custom"))!;
    expect(site.custom?.hidden).toEqual(["payload"]);
    expect(kpis(site.resume)[0]!.label).toBe("Owner label");
    expect(site.resume.projects[0]!.title).toBe("Owner title");
    expect(buildModel(site).chapters.map((c) => c.id)).not.toContain("payload");

    const auth = { authorization: `Bearer ${editToken}` };
    const ed = (await (await handleApi(req("GET", "/api/sites/maya-custom/edit", undefined, auth), {}, d)).json()) as { custom: typeof custom };
    expect(ed.custom.kpis?.[0]?.label).toBe("Owner label");

    const put = await handleApi(req("PUT", "/api/sites/maya-custom", { draft, genome: g, custom: { hidden: [] } }, auth), {}, d);
    expect(put.status).toBe(200);
    const after = (await loadSite(d.store, "maya-custom"))!;
    expect(buildModel(after).chapters.map((c) => c.id)).toContain("payload");
    expect(after.resume.projects[0]!.title).not.toBe("Owner title");
  });
  it("rejects invalid customisations with a clear error", async () => {
    const res = await handleApi(req("POST", "/api/sites", { draft, genome: g, slug: "maya-bad", custom: { hidden: ["comms"] } }), {}, deps());
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(/customisations/);
  });
  it("sites published before customisation existed still load", async () => {
    const d = deps();
    await handleApi(req("POST", "/api/sites", { draft, genome: g, slug: "maya-old" }), {}, d);
    const s = (await loadSite(d.store, "maya-old"))!;
    expect(buildModel(s).chapters.length).toBeGreaterThan(4);
  });
});
