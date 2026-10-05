# Deploying Folio: GitHub → Cloudflare Pages

Folio is a static Next.js export (`out/`) plus Cloudflare Pages Functions (`functions/`) for the API and the published `/u/<slug>` pages. Published sites are stored in Workers KV. Everything here runs on Cloudflare's free plan; the only optional cost is Claude API usage.

## 1. Push to GitHub

```powershell
cd "C:\Project\Live Resume\mission-log-dg01"
git init -b main
git add .
git commit -m "Folio: résumé → interactive portfolio platform"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.gitignore` already excludes these, and Cloudflare rebuilds them from source:

- `node_modules`
- the build output (`out`, `.next`)
- local data (`.data`, `.wrangler`)
- secrets (`.dev.vars`, `.env*`)
- test artefacts and large generated reports

`.gitattributes` keeps line endings consistent between Windows and Linux.

> **Personal data:** the repo includes `public/Dhruv_Goyal_Resume.pdf` (downloadable from the showcase) and `tests/fixtures/*.pdf` (used by the tests). Both contain contact details. Make the repository private if you don't want those public.

## 2. Create the KV namespace (once)

Published sites need durable storage.

```powershell
npx wrangler login
npx wrangler kv namespace create SITES
```

Copy the printed `id` into `wrangler.toml` and uncomment the block:

```toml
[[kv_namespaces]]
binding = "SITES"
id = "<the id>"
```

Commit and push. The id isn't a secret.

## 3. Connect the repo to Cloudflare Pages

In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, then pick the repository.

| Setting | Value |
| --- | --- |
| Project name | `folio` (or change `name` in `wrangler.toml` and the `deploy` script to match yours) |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `out` |
| Environment variable | `NODE_VERSION` = `22` (`.node-version` also pins it); optionally `NEXT_PUBLIC_SITE_URL` = your final URL, used for share-card links |

Every push to `main` then deploys automatically, and pull requests get preview URLs. Because `wrangler.toml` exists, its `[vars]` and KV binding are applied automatically.

## 4. Secrets (optional)

Add the Claude key under **Settings → Variables and Secrets → Add**, with type **Secret**:

- `ANTHROPIC_API_KEY`: turns on Claude for résumé extraction and the chat assistant. Without it, extraction is rule-based and chat runs in offline mode.

Or, from the command line: `npx wrangler pages secret put ANTHROPIC_API_KEY --project-name folio`. Redeploy after adding a secret.

## 5. Optional settings

Set these in `wrangler.toml` `[vars]`:

- `HOME_SITE = "dhruv-goyal"`: show one site at `/` instead of the landing page.
- `ALLOWED_ORIGINS`: extra origins allowed to call the API, for a custom domain on another host.
- Rate limits: `CHAT_*`, `EXTRACT_RATE_PER_MIN`, `CREATE_RATE_PER_*`.
- A custom domain: **Settings → Custom domains** in the Pages project.

## Alternative: deploy from GitHub Actions

Use this instead of step 3. Don't use both, or every push deploys twice.

1. Create a Cloudflare API token with permission **Account → Cloudflare Pages → Edit**.
2. In GitHub, go to **Settings → Secrets and variables → Actions** and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Create the Pages project once with `npx wrangler pages project create folio --production-branch main`.

`.github/workflows/deploy.yml` then builds and deploys on every push to `main`. When the secrets aren't set, it does nothing.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

- build
- type-check
- unit tests (139)
- a Pages Functions compile check
- the Playwright suite on desktop and Pixel 7

## Test the real Cloudflare runtime locally

```powershell
npm run build
copy .dev.vars.example .dev.vars   # then edit; optional
npx wrangler pages dev out         # http://localhost:8788 (workerd + local KV, exactly like production)
```

This exact setup (`wrangler pages dev` with a KV binding) was used to run the full Playwright suite: 79 passed, 0 failed. `npm run serve` stays the faster day-to-day option.
