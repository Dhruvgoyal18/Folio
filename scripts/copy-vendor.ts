/** Copies browser workers that must be served as plain files (PDF.js worker) into public/vendor. */
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/vendor", { recursive: true });
copyFileSync("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/vendor/pdf.worker.min.mjs");
console.log("vendor: pdf.worker.min.mjs");
