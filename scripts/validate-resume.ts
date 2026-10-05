/**
 * Validates src/data/resume.json against the Zod schema and writes the parsed,
 * defaults-applied result to src/data/resume.parsed.json. The browser imports the
 * parsed file, so Zod never ships to the client — validation happens at build time.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ResumeSchema } from "../src/data/schema";

const src = new URL("../src/data/resume.json", import.meta.url);
const out = new URL("../src/data/resume.parsed.json", import.meta.url);
const res = ResumeSchema.safeParse(JSON.parse(readFileSync(src, "utf8")));
if (!res.success) {
  console.error("resume.json failed validation:");
  for (const i of res.error.issues) console.error(` - ${i.path.join(".") || "(root)"}: ${i.message}`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(res.data, null, 2) + "\n");
console.log(`resume.json OK — ${res.data.experience.length} roles, ${res.data.skills.length} skills, ${res.data.projects.length} case files → resume.parsed.json`);
