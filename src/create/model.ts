import { DraftSchema, type Draft } from "@/extract/draft";
import { normalize } from "@/extract/normalize";
import type { Resume } from "@/data/schema";

export type Step = "upload" | "review" | "design" | "publish";
export const STEPS: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "review", label: "Review" },
  { id: "design", label: "Design" },
  { id: "publish", label: "Publish" },
];

export type Normalized = { ok: true; resume: Resume; notes: string[] } | { ok: false; error: string };

/** Client-side mirror of what the server will do on publish, so the review screen can show problems early. */
export function tryNormalize(d: Draft): Normalized {
  if (!d.name?.trim()) return { ok: false, error: "Add your full name to continue." };
  const parsed = DraftSchema.safeParse(d);
  if (!parsed.success) {
    const i = parsed.error.issues[0]!;
    return { ok: false, error: `Please check ${i.path.join(" › ") || "the form"}: ${i.message}` };
  }
  try {
    const { resume, notes } = normalize(parsed.data, "upload");
    return { ok: true, resume, notes };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
  }
}

export const emptyExperience = (): Draft["experience"][number] => ({ org: "", role: "", groups: [{ bullets: [] }] });
export const emptyEducation = (): Draft["education"][number] => ({ institution: "", degree: "", coursework: [] });
export const emptyProject = (): Draft["projects"][number] => ({ title: "", bullets: [] });
export const emptyCompetition = (): Draft["competitions"][number] => ({ name: "", bullets: [] });

export { tidyDraft as tidy } from "@/extract/draft";
