import { preload } from "react-dom";

/** Platform pages (landing, studio, design system) use the house pairing; published sites preload their own. */
export function preloadPlatformFonts() {
  for (const f of ["bricolage-grotesque", "instrument-sans"]) preload(`/fonts/${f}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "" });
}
