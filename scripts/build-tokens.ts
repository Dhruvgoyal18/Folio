import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderTokensCss } from "../src/design/render-css";

const out = fileURLToPath(new URL("../src/design/tokens.css", import.meta.url));
writeFileSync(out, renderTokensCss());
const { fontFaceCss } = await import("../src/genome/fonts");
writeFileSync(new URL("../src/app/fonts.css", import.meta.url), "/* GENERATED from src/genome/fonts.ts — self-hosted OFL fonts; only the families a page uses are downloaded. */\n" + fontFaceCss() + "\n");
console.log("wrote", out);
