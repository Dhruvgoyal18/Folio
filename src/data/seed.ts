import parsed from "./resume.parsed.json";
import type { Resume } from "./schema";

/** The platform's showcase resume (Dhruv Goyal), validated at build into resume.parsed.json. */
export const seedResume = parsed as Resume;
