# SEO GPS: Local Test & Verification Report

> **Author**: Ismail El Asiouty  
> **Date**: October 31, 2026  
> **Branch**: `feature/first-scan-report`  
> **Status**: Verified Locally & Ready for Review

---

## 1. Executive Summary

This report documents the local verification and testing of the **First-Scan Baseline Report + Persistent/New Issue Tracking** release for **SEO GPS**.

All work was completed strictly on the local git branch `feature/first-scan-report` without pushing to GitHub, without deploying to production, without running remote migrations, and without touching any production secrets, in strict compliance with **Hard Delivery Rule 0**.

---

## 2. What Was Built

### A. Core Engine & Analyzers (`engine/`)
1. **Smart URL Sanitizer (`url_sanitizer.py`)**:
   - Trims whitespace padding, `%20`, `\xa0`, consecutive double slashes, and invisible/bidi characters.
   - Normalizes Arabic Unicode to NFC.
   - Tests cleaned URLs before flagging 404s, classifying malformations as **False 404s** with source provenance.
2. **Slug Recovery Engine (`url_sanitizer.py`)**:
   - RapidFuzz Levenshtein similarity and prefix/truncation detection for Arabic and Latin slugs.
   - Computes deterministic confidence scores and suggests 301 redirects to closest active pages.
3. **Dead Page Redirect Matcher & Rule Generators**:
   - Recommends best 301 target based on slug and topic similarity.
   - Generates syntactically valid **Nginx** `rewrite` and Apache **`.htaccess`** `RewriteRule` snippets with character escaping.
4. **Content Freshness Scanner (`content_analyzers.py`)**:
   - Year Pattern Scanner targeting **2027** per specification (current date is late October 2026).
   - Scans title, H1, meta description, and body, providing exact suggested replacement text.
   - CTR trigger keyword analyzer in Arabic and English (fees, admission, requirements, steps, numbers).
   - Thin content detection (< 250 words floor).
5. **Structured Data Gaps & Real FAQ Generator (`content_analyzers.py`)**:
   - Detects question-and-answer pairs ending in question marks in page HTML.
   - Synthesizes valid schema.org `FAQPage` JSON-LD strictly from actual page content.
6. **Deterministic Issue Lifecycle Engine (`lifecycle.py`)**:
   - Computes deterministic SHA-256 fingerprints: `check_id + normalized_url + problem_attributes`.
   - Reconciles issues into 5 idempotent states: `new`, `persisting`, `resolved`, `reappeared`, `ignored`.
   - Tracks `days_open` and flags `is_baseline` for issues discovered during the initial scan.
7. **Comprehensive Site Report Compiler (`report.py`)**:
   - Compiles all 7 anchored sections (A-G) and Top 10 Priority Fixes.
8. **Polite Crawler (`crawler.py`)**:
   - Full async BFS crawl with sitemap index and gz support.
   - Extra imported URLs support (`source=imported`).
   - Two-step confirmation for 404s, 5xx, and timeouts with alternative standard browser User-Agents.
9. **Accuracy Verifier (`verify.py`)**:
   - Invariant enforcement: `total_discovered == total_crawled + total_skipped`.
   - Classification completeness: sum of status distribution equals `total_crawled`.
   - Issue evidence completeness and fingerprint uniqueness.
   - `--live-sample N` ground-truth re-fetcher with independent HTTP client.
10. **Transactional Mailer (`mailer.py`)**:
    - First Scan Baseline Report template (HTML & text).
    - Daily Alert template with summary strip (New / Still Open / Resolved / Reappeared).
    - Offline `.local/outbox/` persistence for local testing and in-app preview.
11. **Local Dev Runner & Scheduler (`local_runner.py`)**:
    - CLI options: `--start`, `--scan`, `--baseline`, `--daily`, `--simulate-day +1`, `--verify`.
    - Local SQLite database layer (`storage.py`) providing complete schema parity with Supabase.
12. **Deterministic Fixture Site (`fixture_site.py`)**:
    - Runs on `http://127.0.0.1:8099`.
    - Day 1 (Baseline) and Day 2 (Regressed/Resolved) switchable states.

### B. Product Areas & Sidebar Navigation
- Removed standalone product areas: Sitemap, Structured Data, Titles & Metadata, Canonicals, Content Cannibalization, and Subdomains (`check_subdomains.py` and `GenericCheckPage.tsx` safely removed).
- Streamlined sidebar: **Overview, Site Report, Issues, Pages, History, Settings** (plus Admin if admin).
- New `SiteReportPage.tsx` with all 7 sections (A-G), anchored navigator, and CSV export.
- Upgraded `IssuesPage.tsx` with lifecycle tabs, days open badges, and detailed evidence drawer.
- Upgraded `PagesExplorerPage.tsx` with source provenance and taxonomy.
- Upgraded `HistoryPage.tsx` with email preview modal and report snapshot viewer.
- Upgraded `SettingsPage.tsx` with schedule, email policy, thresholds, and optional module flags.
- Updated `AddProjectModal.tsx` with "Extra URLs to check" paste & file upload.

---

## 3. Automated Test Results

### 3.1. Python Backend Test Suite (`pytest`)
All 13 tests passed with 100% success rate:

```
============================= test session starts =============================
platform win32 -- Python 3.15.0, pytest-9.1.1, pluggy-1.7.0
rootdir: D:\SEO GPS
configfile: pytest.ini
testpaths: engine/tests
plugins: anyio-4.15.1, asyncio-1.4.0
collected 13 items

engine\tests\test_checks.py .....                                        [ 38%]
engine\tests\test_end_to_end.py .                                        [ 46%]
engine\tests\test_site_report.py .......                                 [100%]

============================= 13 passed in 7.89s ==============================
```

### 3.2. Frontend Build Verification (`tsc && vite build`)
Zero TypeScript or bundling errors:

```
> seo-gps-frontend@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 1634 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.90 kB │ gzip:   0.50 kB
dist/assets/index-CavP7KIk.css   32.63 kB │ gzip:   6.42 kB
dist/assets/index-CxNq8L9n.js   564.47 kB │ gzip: 149.16 kB
✓ built in 10.60s
```

---

## 4. End-to-End Fixture Site Telemetry

### Day 1: Baseline First Scan
- **Discovered**: 27 URLs | **Crawled**: 27 URLs | **Skipped**: 0 URLs
- **Reconciliation Invariant**: `27 == 27 + 0` &rarr; **PASSED**
- **Status Breakdown**:
  - `200_ok`: 16
  - `redirect_3xx`: 6
  - `not_found_404`: 3
  - `server_error_5xx`: 1
  - `blocked_unverified`: 1
- **Key Findings Detected**:
  - False 404: `/%20false-404-leading-space` correctly cleaned to `/false-404-leading-space`.
  - Recoverable Slug: `/arabic-slug-دليل-القب` matched to `/arabic-slug-دليل-القبول` (92% confidence).
  - Redirect Chain: `/chain-step-1` &rarr; 3 hops to `/programs/computer-science` with generated Nginx and .htaccess rules.
  - Outdated Year: 2024 flagged on `/programs/medicine` targeting 2027.
  - Schema Gap: FAQPage missing on `/programs/business` with 2 valid Q&A items detected.
- **Email Output**: Saved to `.local/outbox/` as `FIRST_SCAN_BASELINE`.

### Day 2: Scheduled Re-Scan Simulation
- **Triggered via**: `python -m engine.local_runner --simulate-day +1`
- **Discovered**: 29 URLs | **Crawled**: 29 URLs | **Skipped**: 0 URLs
- **Reconciliation Invariant**: **PASSED**
- **Resolved**: `/true-dead-page-xyz` (page restored on Day 2).
- **New Regressions**: `/new-broken-link` (404) and `/reappeared-issue`.
- **Persisting Issues**: 41 issues persisted from baseline, tracked with `days_open=1` and marked `is_baseline=True`.
- **Email Output**: Saved to `.local/outbox/` as `DAILY_ALERT` with subject:  
  `[SEO GPS] 127.0.0.1:8099: 7 new, 41 still open, 1 resolved, 30 Oct 2026`.

---

## 5. Known Limitations & Architectural Assumptions

1. **Local Mode Storage**: Local mode uses SQLite (`.local/seo_gps.db`) with full schema parity with Postgres/Supabase. When deploying remotely, the migration `20261031000000_first_scan_baseline_schema.sql` must be applied to Supabase.
2. **Optional Modules**: Google Search Console integration and LLM action plan polish are implemented behind feature flags and defaulted to **OFF**, ensuring zero runtime dependency on external cloud credentials for local testing.
3. **Target Freshness Year**: The target year default is set to **2027** per specification requirement ("default = current year, or next year from October onward" – local clock is October 2026). This can be customized per project in Settings.
