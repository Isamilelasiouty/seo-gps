# Free Tier Limits & Production Upgrade Triggers

**SEO GPS** is architected to operate at zero monthly infrastructure cost. This document provides an honest assessment of free-tier boundaries and clear criteria for when to upgrade.

---

## 1. Current Free Tier Architecture Quotas

| Service | Free Tier Quota | Current System Safeguard |
|---|---|---|
| **GitHub Actions** | Unlimited minutes (Public Repos) | Hourly cron with sharded matrix (max 4 parallel jobs) |
| **Supabase** | 500 MB Database Storage | Compact snapshot format (stores diffs only, not full HTML). 60-day snapshot retention. |
| **Supabase Auth** | 50,000 Monthly Active Users | Built-in email + password verification with RLS |
| **Resend** | 3,000 emails / month (100 / day) | Delta-only rule: emails are only dispatched when changes occur |
| **GitHub Pages** | 100 GB bandwidth / month | Static React SPA bundle (< 500 KB gzipped) |

---

## 2. Upgrade Triggers (When to Move to Paid)

| Indicator | Current Limit | Recommended Upgrade Action |
|---|---|---|
| **Websites per User** | 5 Sites | Upgrade Supabase database to Pro ($25/mo) if accommodating > 500 active users. |
| **Crawl Size per Project** | 2,000 URLs / run | Move crawler from GitHub Actions to a dedicated VPS / Railway container ($5/mo) if monitoring enterprise sites (> 50,000 URLs). |
| **Email Volume** | 3,000 / month | Upgrade Resend to Pro ($20/mo) for 50,000 emails/month. |
| **JavaScript Rendering** | Static HTML only | Integrate Headless Chrome (e.g. Browserless / Playwright worker) if client-side hydration is required. |

---

## 3. 1,000,000-Page Scale Operational Limits & System Guardrails

To support deep audits scaling from small blogs up to 1,000,000-page enterprise portals without crashing or exceeding system resources, SEO GPS implements strict guardrails:

| Parameter | Guardrail Limit | Purpose & Behavior |
|---|---|---|
| **Max Page Size** | 5 MB | HTTP streaming cutoff prevents memory exhaustion on large binary or unminified payloads. |
| **Sitemap Recursion** | Depth $\le$ 3 | Traverses nested sitemap index hierarchies while strictly preventing cyclic loop attacks. |
| **Frontier Leasing** | 50–100 URLs / batch | Leased via `FOR UPDATE SKIP LOCKED` with a 10-minute expiry window for crash resiliency. |
| **Per-Host Politeness** | 250 ms delay / 5 workers | Respects host capacity and obeys RFC 9309 `robots.txt` crawl delays. |
| **Similarity Memory** | MinHash LSH (64 perms, 8 bands) | Near-duplicate detection runs in sub-linear $O(1)$ lookup time instead of $O(n^2)$ pairwise memory explosion. |
| **Arabic NLP Indexing** | Sparse CSR Matrices | TF-IDF cannibalization analysis utilizes sparse matrices and scikit-learn nearest neighbors. |
| **Crawl Truncation** | Explicit `truncated: true` | When quota or runner timeout (e.g. 6-hour GitHub Actions job) is reached, discovered URLs are preserved as `discovered_not_crawled` without inventing metrics. |
