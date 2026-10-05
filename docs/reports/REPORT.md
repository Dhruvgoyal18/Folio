# QA report: Folio (résumé → portfolio platform)

Run on 2026-10-03 against the production build (`npm run build && npm run serve`, the local twin of the Cloudflare deployment), in a headless, CPU-only Linux container.

## Summary

| Area | Result |
| --- | --- |
| Unit tests (Vitest) | **108/108 passed**. See the breakdown below. |
| End-to-end (Playwright, desktop 1440×900 + Pixel 7) | **66 passed, 6 skipped, 0 failed**. Skips are by design: keyboard-only tests on touch, and the studio flow, which runs on desktop. The platform and chat specs were then repeated 3× (81/81 passed), as were the showcase and a11y specs (117/117). One unrelated assertion failed once in about 300 runs and has not reproduced. |
| Console errors | None on any route or concept (asserted; the deliberate 401 from a wrong edit token is the only allowed one) |
| Accessibility (axe-core, WCAG A/AA) | **0 violations**: landing, studio, all 3 concepts × desktop + mobile, showcase light and dark, chat panel, design system |
| Lighthouse a11y / best practices | **100 / 100** on every page. SEO 100, except `/create` (63), which is intentionally `noindex`. |
| Lighthouse performance (median of 3) | Every page ≥ **99** desktop and ≥ **79–95** mobile; see the table |
| Chat evaluation | **16/16 passed**, 1 LLM-only case skipped (no API key here) |

### What the unit tests cover

- **Extraction** on the real PDF: name, contact, link annotations, 4 roles with titled groups, education, coursework, skills, competitions and awards. Also a minimal unstructured résumé.
- **Dates, metrics and skills:** every metric value appears in its bullet, reductions are signed, and whole-word / short-name skill matching is checked.
- **Normalise:** valid résumé, evidence only where a bullet names the skill, coursework kept out of skills.
- **Genome:** AA for every recipe × mode × 72 hues, determinism, variety, locks, energy, copy templates, and CSS-injection rejection.
- **API:** extract (rules / Claude / fallback), limits, origin and body size; the full site lifecycle with tokens; reserved and taken slugs; per-site chat.
- **Edge HTML injection:** `</script>`, `$&` and U+2028 cases, OG tags and noscript.
- **Claude extraction guard:** forced tool, data-wrapping, hallucinated bullet dropped.
- **Unchanged from v1:** chat guard, retrieval, tokens and constellation.

## The product flow, tested end to end

Covered by `e2e/platform.spec.ts`:

1. The landing page shows three specimens with different links, from one résumé.
2. In `/create`, *Try a sample résumé* runs extraction, and the review form shows 3 roles.
3. The headline is edited, then **Design my site** is clicked.
4. The iframe preview renders the draft.
5. Switching to Terminal changes `data-concept`. Locking the concept and pressing Remix gives a new seed with the same concept.
6. Pick a free slug, then Publish. The page shows the live URL and the private edit link.
7. `GET /u/<slug>` returns injected HTML: site JSON, `<noscript>` fallback and concept attribute. The page renders with the person's title.
8. The chat orb answers "Where did she study?" from *that* résumé.
9. Opening the edit link loads the design step, and saving shows "Changes saved". A wrong token is refused.
10. Delete removes the site, and `/api/sites/<slug>` returns 404.

Also tested: uploading `tests/fixtures/dhruv.pdf` fills the review with 4 roles (Zolve first); an unreadable file shows a helpful message; and each concept renders without console errors and passes axe.

## Performance

Median of 3 Lighthouse runs (`bash scripts/lighthouse.sh`). Reports are in `lighthouse/`.

| Page | Desktop | Mobile (Slow 4G, 4× CPU) | Mobile LCP | Mobile TBT | CLS |
| --- | --- | --- | --- | --- | --- |
| Landing `/` | **100** | **87** | 3.8 s* | 50 ms | 0 |
| Studio `/create` | **100** | **95** | 2.8 s* | 100 ms | 0 |
| Design system | **100** | **95** | 2.8 s* | 140 ms | 0 |
| Showcase `/u/dhruv-goyal` (prerendered) | **99** | **85** | 3.1 s* | 360 ms | 0.002 |
| Published, Editorial `/u/maya-chen` | **99** | **81** | 3.9 s* | 300 ms | 0 |
| Published, Terminal `/u/maya-terminal` | **99** | **84** | 3.8 s* | 260 ms | 0 |

Desktop LCP is 0.6–0.9 s everywhere.

\* Mobile LCP is Lighthouse's simulated Slow-4G figure, so the < 2.5 s budget is **not met under that simulation**. Desktop and the ≥ 90 / ≥ 80 score budgets are met (one published concept sits at 81). Published sites render on the client from injected JSON, so their LCP waits for the framework chunk. True edge server-rendering is the next lever (see Known limits).

Changes made for the platform build, each one measured:

| Change | Effect |
| --- | --- |
| Hero first; chapters built in an interruptible `startTransition`, and each chapter split into its own chunk | Mobile score on published sites 60 → 79–84; TBT 690 → 300 ms |
| Font preloads moved from the root layout to platform pages. Published sites preload only their genome's pair, and the shell's preloads are stripped at the edge. | Removed 70 KB of wrong-font downloads from each published site |
| Local server caches compressed assets, as a CDN does | Script waterfall went from 2.4 s to tens of milliseconds (it had been a measurement artifact) |
| `noindex` removed from the shell; robots.txt disallows `/site`, `/create` and `/api/` | SEO 66 → 100 on published sites |
| d3-force runs on the server at publish (the layout is stored); the showcase graph is computed at build | No force simulation in a visitor's browser |

## Accessibility

- The **generated palettes** are tested across all 4 recipes × light/dark × 72 accent hues: ink ≥ 7:1, muted, signal-ink and teal ≥ 4.5:1, signal ≥ 3:1, and on-signal ≥ 4.5:1. At publish, a palette that fails is regenerated, never shipped.
- **axe** runs for each concept, the landing page, the studio and the showcase (light and dark), with 0 violations.
- **Studio:** every field is labelled, steps use `aria-current="step"`, focus moves to the step heading, and status messages are `aria-live`. Concept choice is a radio group, locks are toggle buttons, and the energy slider is a Radix slider with `aria-valuetext`.
- Everything from v1 still holds: keyboard paths, screen-reader text for kinetic type, and a designed reduced-motion mode.

## Security and privacy

- **File handling:** files are parsed in the browser and only text is sent. Text is capped at 40k characters, bodies at 256 KB, and uploads and publishes are rate-limited per IP.
- **Edit tokens:** 256-bit random values. Only the SHA-256 is stored, comparison is constant-time, and the token sits in the URL fragment so it never reaches the server in a URL.
- **Injection:** user text reaches HTML only through escaping. JSON in `<script>` escapes `<`, `>`, `&`, U+2028 and U+2029, and replacements use function replacers so `$&` can't expand. Genome colours must be hex or `rgb()` literals and keys are slugs, so nothing can break out of `<style>`.
- **Server-side rebuild:** the server re-derives the résumé from the draft. Client-computed résumé, graph and palette audits are never trusted.
- **Chat:** prompt injection is screened, the résumé is wrapped as data, a canary leak guard runs, and citations are validated against the site's own ids.

## Visual QA

- `screenshots/platform/` holds 24 captures:
  - the landing page on desktop and mobile;
  - the same résumé as six different sites (2 seeds × 3 concepts), on desktop and mobile;
  - the showcase;
  - two published sample sites;
  - the studio's upload, review, design (two concepts) and publish steps.
- `screenshots/` and `video/` keep the v1 showcase captures.

## Known limits

- **Published sites render on the client**, so mobile LCP under simulated Slow 4G is about 3.6–3.9 s. Server-rendering the person's hero at the edge (React on Workers) would close that gap. The `<noscript>` version already serves crawlers and no-JS visitors.
- **The rule-based parser** handles common one- and two-column layouts. Unusual layouts land in "lines we couldn't place" for manual fixing, and Claude extraction (with a key) covers the rest. Scanned PDFs need OCR, which isn't included.
- **Live Claude paths** (extraction and chat) were verified with mocked responses only, because there was no API key here.
- **The free-tier rate limiter** works per isolate; bind Cloudflare Rate Limiting for a global limit. KV is eventually consistent, so an edit can take up to about 60 s to appear at every edge location.
- There are no accounts: losing the edit link means losing edit access. A "recover by email" step would need an email provider.
