/**
 * Enforces "tokens only" in feature code: no raw hex colors, cubic-beziers,
 * numeric motion durations or hard-coded animation timings outside src/design.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/components", "src/app", "src/lib", "src/chat"];
const RULES: Array<[RegExp, string]> = [
  [/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F-])/g, "raw hex color — use a palette role (var(--c-*) / Tailwind token)"],
  [/cubic-bezier\(/g, "raw easing — use ease tokens (cssEase/bezier/var(--ease-*))"],
  [/duration:\s*(?:[1-9]|0\.\d)/g, "numeric duration — use tween()/sec()/reducedTransition"],
  [/animate-\[[a-z-]+_\d/g, "hard-coded CSS animation timing — use var(--dur-*) or var(--loop-*)"],
  [/stiffness:\s*\d/g, "inline spring — use spring tokens"],
];
// Strings that legitimately mention a pattern (documentation copy) can opt out per line.
const ALLOW = "lint-tokens-ignore";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(p) && !p.endsWith("globals.css") ? [p] : [];
  });
}

const problems: string[] = [];
for (const file of ROOTS.flatMap(walk)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes(ALLOW)) return;
      for (const [re, msg] of RULES) {
        re.lastIndex = 0;
        if (re.test(line)) problems.push(`${file}:${i + 1}  ${msg}\n    ${line.trim().slice(0, 140)}`);
      }
    });
}
if (problems.length) {
  console.error(`lint:tokens found ${problems.length} problem(s):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("lint:tokens OK — feature code uses tokens only");
