# SEO GPS: Architecture & Technical Specification

> **Created and Designed by Ismail El Asiouty**

---

## 1. Executive Summary

**SEO GPS** is a portfolio-grade, automated regression monitoring SaaS. It runs on a **Zero-Cost Hosting Architecture**, combining GitHub Actions, Supabase, GitHub Pages, and Resend.

```mermaid
flowchart TD
    User["Registered User / Owner"]
    GHPages["GitHub Pages (Static React App)"]
    SupaDB["Supabase (Postgres + RLS + Auth)"]
    GHA["GitHub Actions (Hourly Dispatcher Cron)"]
    Bot["SEOGPS-Bot Python Engine"]
    TargetSite["Monitored Website"]
    Resend["Resend Email API"]

    User -->|Views Dashboard / Configures| GHPages
    GHPages <-->|JWT Authenticated Queries| SupaDB
    GHA -->|Hourly check for due projects| SupaDB
    GHA -->|Spawns parallel matrix crawl| Bot
    Bot -->|Polite async crawl| TargetSite
    Bot -->|Compares snapshots & stores deltas| SupaDB
    Bot -->|Sends delta report if regressions found| Resend
    Resend -->|Delivers morning email| User
```

---

## 2. Layer-by-Layer Tech Stack

| Component | Technology | Free Tier Budget |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS | Unlimited bandwidth on GitHub Pages |
| **Scheduler** | GitHub Actions Hourly Cron (`0 * * * *`) | Unlimited minutes on Public GitHub Repos |
| **Detection Engine** | Python 3.11+ async (`httpx`, Jinja2, Pytest) | Runs inside GitHub Actions runners |
| **Analytics & Similarity** | R script (`stringdist`, Jaccard) + Python fallback | Runs inside runner environment |
| **Database & Auth** | Supabase (PostgreSQL 15 + RLS + GoTrue Auth) | 500 MB database, up to 50,000 MAU |
| **Email Delivery** | Resend API (or Brevo / SMTP) | 3,000 emails/month free tier |

---

## 4. First-Scan Baseline & Issue Lifecycle Architecture (v2.0)

```mermaid
flowchart TD
    Add["User Adds Website (+ Optional Extra URLs)"] --> Baseline["1. First Scan (Baseline)"]
    Baseline --> Sanitize["Smart URL Sanitizer & Slug Recovery"]
    Sanitize --> Invariants["Accuracy Verifier (verify_report)"]
    Invariants --> Report["Site Report Snapshot (7 Sections + Top 10 Fixes)"]
    Report --> BaseMail["First Scan Report Email"]
    
    Daily["2. Daily Scheduled Run"] --> Crawl["Polite Crawler (Sitemap + BFS + Imports)"]
    Crawl --> Lifecycle["Issue Lifecycle Manager (Deterministic Fingerprints)"]
    Lifecycle --> Reconciliation{"Reconcile with Stored Issues"}
    Reconciliation -->|Not seen before| New["new"]
    Reconciliation -->|Open since earlier| Persist["persisting (days_open, is_baseline)"]
    Reconciliation -->|Was open, now gone| Resolv["resolved"]
    Reconciliation -->|Was resolved, came back| Reapp["reappeared"]
    Reconciliation -->|User marked ignore| Ign["ignored"]
    
    New & Persist & Resolv & Reapp --> DailyMail["Daily Alert Email (.local/outbox or Resend)"]
```

### 4.1. Core Invariants & Accuracy Standards
1. **Reconciliation Invariant**: `total_discovered == total_crawled + total_skipped`. The sum of all status classifications equals `total_crawled`.
2. **Two-Step Confirmation**: Transient failures (404, 5xx, timeouts) re-request with browser User-Agent before recording.
3. **Structured Evidence**: Every finding stores exact requested URL, sanitized URL, response codes, hops, headers, timestamp, and source provenance.
4. **Deterministic Fingerprints**: SHA-256 hash of `check_id + normalized URL + problem attributes` ensuring idempotent reconciliation across scans.
5. **Local First Support**: SQLite database parity in `.local/seo_gps.db`, mock fixture server on `localhost:8099` (Day 1 baseline and Day 2 regression states), and `.local/outbox/` email persistence.

1. **Hourly Dispatcher**:
   - Fires every hour on GitHub Actions.
   - Evaluates: `daily_crawl_hour <= now (in user's timezone) AND last_run_at < today`.
   - Shards active projects into parallel matrix jobs.
2. **Polite Crawling**:
   - Reads `robots.txt` and XML sitemaps (including sitemap indexes and gzip archives).
   - Async crawling with per-host polite delays (250ms) and concurrency limits.
   - SSRF protection blocks private IP ranges and loopbacks.
3. **Deterministic Diffing**:
   - Pulls yesterday's snapshot.
   - Executes registered check plugins.
   - Compares: HTTP status transitions, canonical changes, robots meta, title/description modifications, and schema changes.
4. **Delta-Only Email**:
   - If deltas == 0, no email is sent (prevents notification fatigue).
   - If regressions exist, an email is dispatched containing the before vs after snapshot with direct dashboard links.
