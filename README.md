# Folio — résumé in, one-of-a-kind portfolio out

Anyone can upload a résumé (PDF, DOCX or text). They review what was extracted, design the site with a **design genome**, and publish an interactive, accessible portfolio. Each site has an assistant that answers only from that person's résumé.

Two people with similar résumés don't get the same site. Every site is generated from a seed into a genome, and each genome picks:

- a **concept**: Mission Control, Editorial or Terminal;
- a **palette** generated in OKLCH and checked against WCAG AA before it can ship;
- a **type pairing**, from 6 pairings of 11 self-hosted OFL families;
- a **hero visual**: a skill constellation (SVG/WebGL), contour terrain or flow field;
- **section layouts**: 2 variants each for numbers, timeline, skills and case files;
- **chapter order**, density, radius and texture;
- a **motion personality** (calm, snappy or cinematic);
- the **wording**, including the assistant's name.

Owners can remix the genome, lock the parts they like, change the energy, and pick a default theme.

## Templates

There are nine templates, in `/templates` and in the studio's design step:

| Template | Feel | Best for |
| --- | --- | --- |
| Mission Control | drafting paper, telemetry, skill constellation | engineers, data & ML |
| Editorial | magazine feature, serif, calm | product, design, writing |
| Terminal | phosphor, monospace, quick | backend, infra, security |
| Minimal | Swiss white space, one accent | anyone; the safest for recruiters |
| Noir | dark, light serif, champagne accents | senior leaders, founders |
| Bold | brutalist poster, thick rules, hard shadows | creatives, growth |
| Aurora | gradient light, glass cards, rounded | product engineers, AI builders |
| Scholar | academic paper, abstract and keywords | researchers, grad applicants |
| Blueprint | blueprint blue, dashed linework | hardware, civil, systems |

Each template is a `ConceptDef` in `src/genome/concepts.ts`, which sets its palettes, fonts, heroes, layouts and copy voice. It has a hero layout in `Hero.tsx`, a CSS signature in `globals.css`, and a curated starting seed in `src/genome/templates.ts`.

The gallery previews any template live. **Remix** re-rolls the design inside that template, and **Use this design** opens `/create?template=<id>&seed=<n>`.

## Impact numbers

Each metric has a `kind`: `change`, `share`, `reduction`, `lift`, `count`, `money` or `multiple`. Extraction infers it from the wording, or it can be set explicitly. The kind decides how the number is drawn:

| Kind | Example | Drawn as |
| --- | --- | --- |
| change | 68% → 87% | before/after bars |
| share | 95% reliability | a 0–100 meter |
| reduction | 99.93% less memory | the remainder, plus an honest ratio ("≈1,400× less") |
| lift | +27% | baseline vs lifted |
| count | 20 workflows | pips for small counts, the full figure for big ones |

Every card shows the case file it belongs to, an optional `note`, and the bullet it was quoted from. `kpiRank` orders the cards.

Dhruv Goyal's original "Mission Log DG-01" design is reproduced exactly as a genome. It is the built-in showcase at `/u/dhruv-goyal`.

```
src/
  app/            /  (landing) · /create (studio) · /site (shell for published sites) · /u/[slug] (prerendered showcase) · /design-system
  extract/        pdf.ts + pdf-lines.ts (PDF.js → lines + link annotations) · heuristic.ts (rule-based parser) · llm.ts (Claude tool-use)
                  draft.ts (loose Draft schema) · normalize.ts (Draft → strict Resume: ids, dates, skills, evidence, metrics, case files)
                  dates.ts · metrics.ts · skills.ts (vocabulary, domains, whole-word matching)
  genome/         schema · generate (seeded, lockable) · concepts · palette + color (OKLCH, AA enforcement) · fonts · apply (CSS vars, motion) · validate
  site/           SiteRenderer · SiteShell (injected / preview / demo data) · model (derived view) · showcase (signature genome)
  create/         CreateApp · UploadStep · ReviewStep · DesignStep (live iframe preview) · PublishStep · loaders (PDF/DOCX/text in the browser)
  server/         api.ts (one router for every /api route) · store (KV / memory) · file-store (Node) · auth (edit tokens) · slug · render (edge HTML injection) · cf.ts
  chat/           handler · prompt · guard · retrieval · knowledge · ratelimit       (multi-tenant: /api/chat?site=<slug>)
  components/     sections/ (each with genome variants) · visuals/ (Contours, Flowfield) · three/ (Constellation) · chat/ · primitives/ · ui/
functions/        index.ts (HOME_SITE) · u/[slug].ts (inject published site) · api/[[path]].ts (→ src/server/api.ts)
scripts/          serve (local twin of Cloudflare) · publish-sample · capture-platform · capture · lighthouse.sh · chat-eval · fps · build-tokens · lint-tokens
tests/unit/       Vitest — 154 tests      e2e/   Playwright — 126 tests (desktop + Pixel 7), incl. axe on all 9 templates
```

## Quick start

```bash
npm install
npm run build          # validate → tokens → vendor (PDF.js worker) → lint tokens → next build (static, ./out)
npm run serve          # http://localhost:4173 — landing, studio, /u/<slug>, /api/* (same router as production)
```

Open `/create`, then click **Try a sample résumé**, or drop in your own PDF. Published sites are saved as JSON in `./.data/sites`. Set `SITES_DIR` to change the folder, or `SITES_STORE=memory` to keep nothing on disk.

`npm run dev` runs the Next dev server for UI work. It has no `/api`, so the studio's upload and publish steps need `npm run build && npm run serve`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Secret. Turns on Claude for **extraction** (forced tool call, grounding filter) and **chat**. Without it, extraction is rule-based and chat quotes résumé lines (offline retrieval). |
| `ANTHROPIC_MODEL` / `ANTHROPIC_EXTRACT_MODEL` | Default `claude-haiku-4-5`. |
| `HOME_SITE` | Serve one site at `/` instead of the landing page (a personal deployment), for example `dhruv-goyal`. |
| `CHAT_RATE_PER_MIN` / `CHAT_RATE_PER_DAY` / `CHAT_SITE_PER_DAY` | Chat limits per IP, and per site per day. |
| `EXTRACT_RATE_PER_MIN`, `CREATE_RATE_PER_MIN` / `CREATE_RATE_PER_DAY` | Upload and publish limits per IP. |
| `ALLOWED_ORIGINS` | Extra origins allowed to POST to the API. Same-origin is always allowed. |

## Deploy (GitHub → Cloudflare Pages, free tier)

The full guide is in **[docs/DEPLOY.md](docs/DEPLOY.md)**. In short:

1. Push to GitHub. `.gitignore` and `.gitattributes` are set up already.
2. Run `npx wrangler kv namespace create SITES`, then paste the id into `wrangler.toml`.
3. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**. Set the build command to `npm run build`, the output directory to `out`, and Node 22.
4. Optionally, add the secret `ANTHROPIC_API_KEY`.

Static pages are served from the CDN. `functions/` handles `/api/*` and `/u/<slug>`, where a published site is the static `/site` shell with the person's data, genome CSS, OG tags and a `<noscript>` version added at the edge. To try the real Cloudflare runtime locally, run `npx wrangler pages dev out`. CI (`.github/workflows/ci.yml`) builds, type-checks and runs the unit and browser tests on every push.

## How a résumé becomes a site

1. **Upload, in the browser.** PDF.js rebuilds reading-order lines, marks wide gaps with a tab, and collects link annotations (LinkedIn and GitHub are often only links). mammoth handles DOCX. Only the text is sent.
2. **Extract.** `POST /api/extract` always runs the rule-based parser. With a key, Claude also runs: it must call `save_resume`, the résumé is wrapped as untrusted data, and any bullet whose words aren't in the source is dropped. Its result is used only if it found at least as much as the rules did.
3. **Review.** The owner edits a human-shaped `Draft`. `normalize()` runs live in the browser and again on the server. It assigns ids and dates, maps skills to domains, links a skill to a bullet only when the bullet names it, and takes metrics only from numbers in the bullet (signs come from the verb). It also picks KPIs and groups bullets into case files.
4. **Design.** `generateGenome(resume, {seed, concept?, locks, energy, theme})` is deterministic and content-aware (for example, no skills graph without evidence). The preview is the real renderer in an iframe, updated by `postMessage`.
5. **Publish.** The server re-normalises the draft, validates the genome (schema, plus strict colour formats so nothing can escape the `<style>` tag), repairs any palette that fails AA, computes the skills-graph layout, and stores the site. The owner receives `/u/<slug>` and a private edit link (`/create?edit=<slug>#token=…`). Only a SHA-256 hash of the token is stored. The token sits in the URL fragment, so it never reaches server logs.

## The design and motion system

- **Tokens:** `src/design/tokens.ts` and `motion.ts` are the base. A genome overrides the colour, font, radius, density and duration variables, and `applyMotionPersonality` rescales the JS springs and staggers. `npm run lint:tokens` keeps raw colours and timings out of feature code.
- **Live documentation:** `/design-system` shows every token and primitive, with live controls.
- **New concepts** are data: add a `ConceptDef` (weighted palettes, hue bands, fonts, heroes, motions, variants, voice) in `src/genome/concepts.ts`, plus any CSS under `html[data-concept="…"]`.

## The assistant

- `POST /api/chat?site=<slug>` returns server-sent events (`meta`, `delta`, `replace`, `cite`, `done`). The site's résumé is loaded from the store, and the assistant's name comes from the genome.
- **Guards:** an injection screen and an off-topic screen run before the model. The résumé is placed in the prompt as delimited data. A canary leak guard withdraws a streamed answer if the model echoes its instructions. Citations are checked against the site's own section ids. Limits apply per IP and per site.
- **Offline mode:** BM25 retrieval quotes the matching lines.
- `npm run eval:chat` runs 17 questions, including injection, off-topic and memory cases (`SITE=<slug>`).

## Tests and QA

```bash
npm test                      # Vitest: extraction on the real PDF, metrics, skills, normalise, genome (AA × all hues), API lifecycle, tokens, chat
npx playwright test           # e2e: landing, 3 concepts + axe, create → publish → visit → chat → edit → delete, PDF upload, legacy showcase suite
npm run eval:chat             # live chat evaluation
node scripts/capture-platform.mjs   # landing, studio, same résumé as six sites (run scripts/publish-sample.ts first)
bash scripts/lighthouse.sh    # PAGES="home u/dhruv-goyal u/maya-chen create" — median of 3, desktop + mobile
```

Reports are in `docs/reports/`; start with `REPORT.md`.

## Performance and accessibility decisions

- **Published sites** are client-rendered from the injected JSON. The hero renders first, and the chapters (each its own chunk) are built in an interruptible transition. Only the site's own fonts are preloaded.
- **The showcase** is fully prerendered.
- **Palettes cannot fail AA.** The generator enforces contrast, the validator re-checks it at publish, and a failing palette is regenerated, never shipped.
- WebGL, chat and the terminal load on idle or on intent. Reduced motion is a designed experience. Hero text is painted from frame one (transform-only reveals).
