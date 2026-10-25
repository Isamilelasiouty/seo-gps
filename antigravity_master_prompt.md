# MASTER PROMPT: SEO Health Monitor (Multi-User SaaS, Zero-Cost Hosting)

You are a Principal Software Engineer, Product Architect and Senior Product Designer working in Google Antigravity. Build, test, deploy and hand over the complete product described below. This is a portfolio-grade commercial product that will be shown to the market, so every detail (UI, code quality, security, documentation) must look and behave like a professional SaaS. Work autonomously, but follow the "Inputs" and "Phases" sections exactly.

---

## 0. Working Rules (read first, apply for the entire project)

1. **Future-proof, incremental development.** The owner will keep adding features later. Architecture must be modular and plugin-based (see section 5). When the owner later asks for a new feature or a fix, change ONLY what is required. Never rewrite, rename or restructure existing working modules unless explicitly asked.
2. **Create `AGENTS.md` at the repo root** (and mirror it in any rules file Antigravity reads) containing: architecture map, folder conventions, how to add a check, how to add a dashboard page, design tokens, "do not touch" areas, and the rule: *"Make the smallest change that satisfies the request. Do not refactor unrelated code. Add a migration for any schema change. Update CHANGELOG.md."*
3. **Never commit secrets.** Use environment variables, GitHub Actions Secrets and `.env.example`.
4. **Everything must be free to run** (see section 4). Do not introduce any paid service or any component that needs a credit card.
5. **Verify your own work.** After each phase, run tests, run the app, open it in the browser, take screenshots, and fix problems before moving on. Do not report a phase complete until verified.
6. **Ask me once, up front,** for every credential/decision you need (section 3), then continue without interrupting me.

---

## 1. Product Summary

An automated SEO regression monitor. Each registered user creates a private account, adds up to **5 websites**, and the system crawls each site **daily at the user's chosen local time**, compares today's snapshot with the previous snapshot, and emails a **delta-only** report (what broke or changed since yesterday). It runs in the cloud, so nothing needs to be open on the user's machine.

**Problem it solves:** "silent regressions": 404/500 spikes, canonical changes, deleted or altered title/meta description, accidental `noindex`, sitemap inconsistencies, broken schema, exposed staging/dev subdomains, and pages competing for the same topic, all of which go unnoticed for days.

**Branding:**
- Owner/brand name: **Ismail El Asiouty**
- Logo file on my machine: `D:\Ismail El Asiouty\Prtfolo images\logo` (extension unknown: detect `.png/.svg/.webp/.jpg`). Copy it into `frontend/public/brand/`, generate favicon and sizes from it, and use it in the sidebar header, login page, email header and browser tab. Show my name as "by Ismail El Asiouty" next to the product name, similar to how "by NP digital" appears next to the Ubersuggest logo.
- Product name: make it a single config constant `PRODUCT_NAME` (default: `SEO GPS`) used everywhere, so I can rename it in one place.

---

## 2. Design Direction (critical)

**Reference 1: Ubersuggest dashboard** (layout and product feel):
- Top bar: logo + product name "by Ismail El Asiouty" on the left; on the right a language switch (EN/AR), "Help", and the user menu.
- Left sidebar with a highlighted **Project switcher card** at the top: shows site favicon, project name and domain; clicking opens a dropdown list of the user's projects (favicon, name, domain, small edit pencil button each) and an **"Add Project" row showing "X of 5 available"**.
- Below the switcher, grouped sidebar sections with chevrons (Overview, Issues, Pages, Sitemap, Schema, Metadata, Canonicals, Content Similarity, Subdomains, History, Settings).
- Main area: very large bold page title ("Dashboard"), a "Getting started" progress pill (e.g. 0/4: add site, verify ownership, set email, first crawl), then a prominent **Health Score** card with a semi-circle gauge, followed by "Your Website In Numbers" with small stat tiles and change badges (green up / red down / neutral).
- Soft tinted card backgrounds, section eyebrow labels in small caps ("MAIN INDICATOR", "KEY SEO INDICATORS").

**Reference 2: Google Search Console** (UX behavior):
- Overview page with 3-4 clickable summary tiles above a large time-series chart; clicking a tile toggles that metric's line.
- Date-range selector (7 / 28 / 90 days) that drives all charts and tables.
- Status pages in the style of "Page indexing": a bar/summary of issue types with counts, then a table of affected URLs, each issue type opening a detail view with an affected-URL list, "first detected" and "last seen" dates, and a **"Validate fix / Re-check"** button.
- Dense, readable tables with sorting, filtering, search, pagination, row-click detail drawer and CSV export.
- Clear empty states and skeleton loaders. Nothing should ever look broken while loading.

**Visual identity:**
- **White and gold.** Background `#FFFFFF`; surfaces `#FAFAF7`; primary gold `#B8892B` (hover `#9A7220`); gold tint `#FBF5E4`; gold border `#E9D9A8`; ink `#16140F`; muted text `#6B665A`; hairline borders `#ECE8DC`.
- Severity colors, muted and professional: Critical `#B42318`, Warning `#B54708`, Notice `#175CD3`, Healthy `#067647`. Always pair color with an icon or label (accessibility).
- Typography: **Inter** for Latin, **IBM Plex Sans Arabic** for Arabic; large, heavy page titles (800 weight), comfortable line-height, tabular numerals for metrics.
- Generous whitespace, 12px card radius, subtle 1px borders and very soft shadows. A refined editorial feel.
- **Must NOT look AI-generated.** Strictly forbidden: sparkle/magic-wand/robot/brain icons, "AI" badges or wording, purple/blue neon gradients, glassmorphism, floating blurred blobs, emoji in the UI, gradient text, generic stock illustrations, excessive rounded pill buttons, lorem ipsum. Use a consistent line-icon set (Lucide) with sensible choices. Real, specific microcopy written like a product team would write it.
- **Full RTL support** with Arabic and English UI translations (i18n files, no hardcoded strings). Mirror layout correctly in RTL.
- Fully responsive (desktop first, tablet and mobile usable). Keyboard accessible, WCAG AA contrast.
- Provide a design-token file (`tokens.css` / Tailwind config) so the whole look can be tuned centrally.

---

## 3. Inputs I Will Give You (ask once, in a single message, at the start)

Ask me for exactly these, with one-line instructions on where to find each:
1. GitHub username and a fine-grained Personal Access Token (repo, workflows, secrets, pages permissions) OR confirm GitHub CLI / GitHub MCP is already authenticated in Antigravity.
2. Desired repo name (suggest `seo-gps`) and visibility. **Default public**, because GitHub Actions minutes are unlimited for public repos. Warn me that the code is then public and that secrets and user data never go into the repo.
3. Supabase project (free): Project URL, anon key, service-role key, and DB connection string. If you can create it via the browser, guide me; otherwise tell me the exact clicks.
4. Email provider API key (free tier): recommend Brevo or Resend; confirm the sender address / verified domain. Fall back to SMTP if needed.
5. Confirm the logo file location/extension.
6. Hosting target for the frontend: default GitHub Pages; alternative Cloudflare Pages.

Never print my keys back in logs or commit them.

---

## 4. Zero-Cost Architecture (mandatory)

No always-on server. Everything runs on free tiers:

| Layer | Technology |
|---|---|
| Scheduler + crawler + diff + email | **GitHub Actions** (cron every hour) running Python |
| Similarity analytics | **R** script (`stringdist`, `tm` or `text2vec`) invoked from the workflow, with an automatic **Python fallback** (scikit-learn TF-IDF + cosine) if R fails |
| Database + Auth | **Supabase** (Postgres + Auth + Row Level Security) |
| Frontend | React + Vite + TypeScript + Tailwind, static build on **GitHub Pages** (or Cloudflare Pages) |
| Light server logic (run-now, ownership verification) | Supabase Edge Functions (free) |
| Email | Brevo / Resend / SMTP with Jinja2 HTML templates |

Requirements that come from the free-tier reality:
- **Time precision:** GitHub scheduled runs are not guaranteed to fire at the exact minute and can be delayed. Therefore run the dispatcher **hourly**; it selects projects where `local_run_time <= now (in user's timezone)` AND `last_run_date < today`. This also self-heals missed or delayed runs. Tell users in the UI that delivery happens within about an hour of the chosen time.
- **Keep-alive:** scheduled workflows are disabled in public repos after 60 days without repo activity, and free Supabase projects can pause when idle. Add a lightweight workflow that makes a trivial DB query and a small automated commit/heartbeat (to a dedicated `heartbeat` branch or file) weekly.
- **Scale/load:** shard crawling with a GitHub Actions **matrix** (N projects per job, max parallel set by config) so growth in users does not create one giant job. Enforce per-job timeout, per-project page cap (default 2,000 URLs from the sitemap + discovered links; configurable), async concurrency limit, per-host polite delay, retries with backoff, and resumable crawls.
- **Storage budget (Supabase free ~500 MB):** store compact snapshots (url, status, canonical, title, description hash + short text, robots, schema hash, content hash, simlified text fingerprint). Store full "before/after" values only for detected issues. Add a retention job (default 60 days of snapshots, 180 days of issues) and a daily storage-usage check.
- The frontend is static and served from a CDN, so dashboard traffic costs nothing and scales.
- Document honestly in `docs/LIMITS.md` what the free setup supports and the exact upgrade path (when to move to a paid runner or DB) without making that necessary now.

---

## 5. Application Architecture (plugin-based, built to be extended)

Monorepo layout (adapt only if you have a strong reason):

```
/frontend            React app (pages, components, i18n, tokens)
/engine              Python package: crawler, parsers, checks, diff, mailer
  /engine/checks     ONE FILE PER CHECK, auto-registered
  /engine/analytics  R scripts + Python fallback
  /engine/mail       Jinja2 templates
/supabase
  /migrations        versioned SQL migrations (never edit applied ones)
  /functions         Edge Functions
/.github/workflows   dispatcher, crawl-matrix, keepalive, deploy-frontend, ci
/mcp                 optional read-only MCP server (see section 9)
/docs                ARCHITECTURE.md, ADDING_A_CHECK.md, ADDING_A_PAGE.md, LIMITS.md, SECURITY.md
AGENTS.md  CHANGELOG.md  .env.example
```

**Check plugin contract.** Every check is a class implementing:
`id`, `title`, `category`, `default_severity`, `analyze(current_snapshot, previous_snapshot, context) -> list[Issue]`, plus metadata describing how the UI should render it (columns, before/after fields, help text, how to fix). A registry auto-discovers files in `engine/checks/`. The `issues` table is generic (`check_id`, `severity`, `url`, `before` jsonb, `after` jsonb, `first_seen`, `last_seen`, `status`). The frontend renders issue pages **from check metadata**, so adding a new check requires only one new Python file (+ optional translation keys), with zero changes to the core engine or existing pages. Prove this by writing `docs/ADDING_A_CHECK.md` and a worked example check (e.g. "missing H1") that you add and then keep as a sample.

Also add a **feature-flag table** so new modules can ship disabled and be enabled per user or globally.

---

## 6. Detection Engine (all required)

Crawl via the XML sitemap (including sitemap index files, gzip) plus the root URL and internal link discovery. Use `httpx` async + `lxml`/`selectolax`/BeautifulSoup. Respect `robots.txt` and crawl-delay, identify with a clear User-Agent including a URL to an info page.

1. **HTTP status monitor:** status per URL; detect 200 to 404/410/5xx, new redirects (301/302/307/308), redirect chains and loops, timeouts, slow responses (configurable threshold).
2. **Canonical auditor:** missing, changed target, canonical pointing to non-200/redirected/non-indexable URL, canonical pointing off-domain unexpectedly, multiple canonicals, canonical in HTTP header vs HTML conflict.
3. **Metadata integrity:** title missing/changed/duplicated/too long or short; meta description missing/changed/truncated/duplicated; robots meta and `X-Robots-Tag` changes, especially a newly added `noindex` or `nofollow`. Detect bulk changes (e.g. "412 titles changed today") and collapse them into one grouped issue with a sample list so emails stay readable.
4. **Sitemap validation:** sitemap fetch failures, XML errors, non-200 URLs inside the sitemap, redirected or noindex or canonicalized-away URLs inside the sitemap, live indexable URLs missing from the sitemap, sitemap size/limit problems, `lastmod` anomalies.
5. **Structured data:** extract JSON-LD, Microdata, RDFa; validate syntax; compare with the previous snapshot to detect removed or corrupted types and missing required properties per type (Article, Product, Organization, BreadcrumbList, FAQPage, LocalBusiness, etc.).
6. **Subdomain and environment exposure:** passive discovery only, from internal/external links, sitemap, response headers, CORS/redirect targets and Certificate Transparency (crt.sh). Flag new `dev.`, `staging.`, `test.`, `uat.`, `beta.`, `old.` etc., and flag when a discovered non-production host is publicly reachable and lacks `noindex`/auth. Never port-scan or probe aggressively.
7. **Content similarity / cannibalization:** extract title, H1/H2, and main body text; compute TF-IDF cosine similarity and title/H1 overlap; cluster pages targeting the same topic; report clusters above a threshold. The R script implements the heavy lifting and Python fallback guarantees the pipeline never fails because of R. Limit comparison to new/changed pages plus an efficient candidate-reduction step so it scales.

**Quality rules:** deterministic diffs, idempotent runs (re-running the same day must not duplicate issues), "new" vs "ongoing" vs "resolved" issue lifecycle, a baseline first run that **does not email a flood of "new issues"** (first run sends a short onboarding summary instead), and noise controls (ignore patterns per project, e.g. query strings, pagination, specific paths).

---

## 7. Users, Accounts and Security

- **Supabase Auth:** email + password with email verification, password reset, and optional Google sign-in. Session handling in the frontend.
- **Strict data isolation with Row Level Security** on every table: a user can only read and write their own projects, snapshots, issues and settings. Write automated tests that prove user A cannot read user B's data.
- **Max 5 projects per user**, enforced in the database (trigger/constraint), not only in the UI. UI shows "X of 5 available".
- **Domain ownership verification** before the first crawl (meta tag, DNS TXT or uploaded file option). This prevents the tool from being abused to hammer third-party sites.
- **SSRF and abuse protection:** block private/loopback/link-local IP ranges and non-http(s) schemes, re-validate after redirects, cap response sizes, cap redirects, per-user daily crawl limits, global kill switch.
- Sanitize everything that is rendered in the dashboard or email (page titles are untrusted input).
- Unsubscribe link and per-project email preferences in every email. Add `docs/SECURITY.md`.

---

## 8. Dashboard Pages and Flows

Build these pages, all consistent with section 2:

1. **Auth:** Sign up, Sign in, Forgot password, Verify email. Branded with logo, white/gold, split layout with a short value proposition on the side (no illustrations that look generic: use a clean product screenshot-style mock of the real UI).
2. **Onboarding wizard (Add Project):** Root URL, Sitemap URL (auto-detect from `robots.txt` or `/sitemap.xml`), recipient email, daily time + timezone (searchable list, default from the browser), ownership verification step, then "Run first crawl now".
3. **Overview:** health score gauge, severity counters, GSC-style toggle tiles + 7/28/90-day chart (issues over time, 404 count, pages crawled, indexable pages), "What changed today" list, last run status and next scheduled run.
4. **Issues:** grouped by severity and type with counts; click-through to affected-URL table with before/after diff view, first/last seen, status (open/resolved/ignored), **Re-check** button, bulk ignore, CSV export.
5. **Pages explorer:** every crawled URL with status, canonical, title, description, robots, schema types, similarity cluster; filters and column picker.
6. **Sitemap, Schema, Metadata, Canonicals, Content Similarity (cluster cards with side-by-side comparison), Subdomains:** one page each, built on the generic check-driven renderer where possible.
7. **History:** a timeline of every daily run with changes per day and the ability to open any past day's report (the same content as the email).
8. **Settings:** project settings (URLs, schedule, ignore rules, thresholds, recipients, delivery channels), notification toggles per severity, account, language, delete project/account (with confirmation and full data deletion).
9. **Run now:** triggers an on-demand crawl via Edge Function that dispatches the GitHub workflow (with rate limiting), shows live status.

Global UX: toast feedback, optimistic updates, skeletons, helpful empty states, error boundaries, and a "Help" drawer with plain-language explanations of each issue type and how to fix it.

---

## 9. Email Report and Optional Claude Integration

**Email (HTML, tested in Gmail/Outlook/mobile, inline CSS, white/gold, logo header):**
- Subject: `[Critical 3 | Warning 5] example.com: SEO changes detected, 25 Oct`.
- Sent only when there is a delta (plus an optional weekly "all clear" digest, off by default).
- Top: summary strip with counts. Then sections in order **Critical, Warning, Notice**, each as a table: affected URL, issue, **Before vs After**, first seen. Cap long lists and link to the dashboard "View all N".
- A "Resolved since yesterday" block. Footer with preferences and unsubscribe.
- Generate a plain-text alternative too. Provide an email preview page in the dashboard.

**Claude integration (read-only, optional):** add `/mcp`, a small MCP server that lets Claude connect to my deployment and answer questions such as "what broke on techhouseksa.com this week?" by calling read-only tools (list projects, list issues, get run summary, get page snapshot) authenticated with a per-user API token created in Settings. Document setup in `docs/CLAUDE_MCP.md` with the exact connector config. Do not call any paid AI API from the product itself.

---

## 10. Phases (execute in order, verify each)

1. **Foundation:** repo, structure, AGENTS.md, tokens, CI, Supabase schema + migrations + RLS + tests.
2. **Engine:** crawler, snapshot storage, all 7 check modules, issue lifecycle, R + Python fallback, unit tests with fixture sites (include a local fixture server that simulates regressions so each check is proven).
3. **Mail:** templates, preview, delivery, unsubscribe.
4. **Scheduler:** hourly dispatcher, matrix crawl, keep-alive, retention, idempotency; simulate delayed runs and a second same-day run.
5. **Frontend:** design system first, then pages in the order of section 8; screenshot every page in EN/LTR and AR/RTL, desktop and mobile; fix visual defects.
6. **Security pass:** RLS tests, SSRF tests, ownership verification, rate limits.
7. **Deploy (direct, via API/CLI/MCP, no manual steps for me):** create the GitHub repo, push all code, set Actions secrets, apply Supabase migrations, deploy Edge Functions, enable GitHub Pages and publish the frontend, trigger the first workflow run and confirm it succeeds.
8. **End-to-end proof:** create a test user, add a test site, run a crawl, introduce a regression on the fixture site, run again and confirm the correct email arrives. Capture the evidence.

---

## 11. Final Handoff (mandatory deliverable)

When finished, give me a **Connection Sheet** I can use immediately, containing:
- Live dashboard URL, GitHub repo URL, Actions URL, Supabase dashboard URL.
- A checklist of what is already configured and the **only** manual steps left (if any), each with exact clicks.
- How to create my first account and add my first site in under 2 minutes.
- How to connect Claude (MCP) with the exact config snippet.
- How to add a new check or page later (link to the docs), and a ready-to-paste example of an update request, e.g. *"Add a check for missing hreflang"*, proving it only touches the new files.
- A short list of known limitations of the free setup and honest upgrade triggers.

Do not stop at "code written". The task is done only when the deployed system works end-to-end and the Connection Sheet is delivered.
