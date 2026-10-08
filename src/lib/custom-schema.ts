import { z } from "zod";
import { SECTION_IDS, type SectionId } from "@/genome/schema";
import { HIDEABLE, type Custom } from "./customize";

const line = (max: number) => z.string().trim().max(max);

/** Server-side (and studio) validation of owner customisations; limits keep stored sites small. */
export const CustomSchema = z
  .object({
    hidden: z.array(z.enum(HIDEABLE as [Exclude<SectionId, "comms">, ...Array<Exclude<SectionId, "comms">>])).max(HIDEABLE.length).default([]),
    order: z.array(z.enum(SECTION_IDS)).max(SECTION_IDS.length).optional(),
    kpis: z
      .array(z.object({ ref: z.string().max(160), label: line(60).optional(), note: line(80).optional() }))
      .max(6)
      .optional(),
    projects: z
      .array(z.object({ id: z.string().max(120), title: line(90).optional(), summary: line(420).optional(), hidden: z.boolean().optional() }))
      .max(60)
      .optional(),
    keepWording: z.boolean().optional(),
  })
  .default({ hidden: [] });

// the hand-written type in customize.ts must stay in step with the schema
type Parsed = z.output<typeof CustomSchema>;
const _check: Custom = {} as Parsed;
void _check;
