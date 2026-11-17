# Changelog

All notable changes to the **SEO GPS** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-11-18
### Added
- **Semrush-Grade 1,000,000-Page Engine Architecture**:
  - **Persistent Frontier & Sharded Leasing**: Scalable `crawl_frontier` queue supporting PostgreSQL RLS & `FOR UPDATE SKIP LOCKED` batch leasing (with SQLite fallback) enabling multi-worker distributed crawling, resume-after-crash, and zero double-crawls.
  - **Fast Lexbor DOM Parser (`engine/parser.py`)**: High-performance C-level Lexbor HTML parser (`LexborHTMLParser`). Safely strips `<script>`, `<style>`, `<noscript>`, `<template>`, and HTML comments from headings, extracts uncorrupted single-quote apostrophes from meta descriptions, extracts clean main content text, JSON-LD schemas, and soft 404 patterns.
  - **SSRF & URL Normalization Suite (`engine/url_utils.py`)**: RFC-compliant normalization (lowercasing scheme/host, port stripping, query sorting, tracking parameter stripping: `utm_*`, `gclid`, `fbclid`), loopback/private/metadata IP protection, and multi-domain/port internal URL resolution.
  - **Typed Data Contract (`engine/models.py`)**: Strict typing for `PageSnapshot`, `LinkItem`, `AssetItem`, `HreflangEntry`, and `RedirectHop` with full backward compatibility and `.to_dict()` serialization.
  - **Scalable Arabic NLP & Near-Duplicate Clustering (`engine/similarity.py`)**: Unified Arabic text normalizer (Alef/Hamza, Taa Marbuta, Yaa, diacritics, tatweel), MinHash LSH (64 perms, 8 bands) for sub-linear near-duplicate detection, and TF-IDF cannibalization analysis.
  - **Semrush-Calibrated Proportional Health Scoring (`engine/scoring.py`)**: Non-linear logarithmic/proportional scoring based on percentage of affected pages (`SEVERITY_WEIGHTS = {"critical": 1.0, "warning": 0.35, "notice": 0.08}`) with per-check penalty ceiling (3.5 pts max) preventing false catastrophic drops.
  - **Internal PageRank Engine (`engine/graph.py`)**: Power iteration link equity distribution (damping 0.85, 20 iterations, 0-100 scale) for identifying deep/orphan pages and link equity leaks.
  - **Truthful Status Invariant Checker (`engine/verify.py`)**: Global reconciliation check `total_discovered == total_crawled + total_skipped + blocked_by_robots + total_failed + total_pending` with automated `--live-sample N` ground truth verification.
  - **Validation Test Gates**:
    - `test_contract.py`: AST validation of check plugin field access against `PageSnapshot`.
    - `test_accuracy.py`: Ground truth tests for apostrophe retention, comment/script heading filtering, soft 404 detection, unreciprocated hreflangs, and canonical redirects.
    - `test_resumability.py`: Batch leasing, lease timeouts, zero double-crawling, and resume capability.
  - **Database Migration**: `supabase/migrations/20261118000000_resumable_frontier.sql` adding `crawl_frontier` with status enums (`pending`, `leased`, `crawled`, `failed`, `skipped`, `blocked_by_robots`), indices, and `lease_frontier_batch` RPC.

### Changed
- **Zero Data Fabrication & Transparency**:
  - Replaced fake 200 HTTP statuses, fake 350 word counts, and slug-derived titles for un-crawled discovered URLs with honest `discovered_not_crawled` / `pending` status records (`statusCode: 0`, `wordCount: 0`, `schemas: []`).
  - Transparent sample disclosure: UI and Edge functions prominently flag capped audits with `truncated: true` and display representative sample notices ("Deep-audited first N pages out of N discovered URLs").
  - Frontend Pages Explorer and Quick Audit render un-crawled pages with slate `Discovered` / `مستكشفة` status and `-` placeholders.
  - Upgraded crawler with 5MB streaming response cap, recursive XML sitemap index processing (depth <= 3), and RFC 9309 robots.txt compliance.
  - Replaced $O(n^2)$ pairwise clustering in `engine/analytics/cluster.py` with scalable sparse TF-IDF and NearestNeighbors.
  - Loaded actual previous scan snapshots from storage in `engine/main.py` instead of passing empty baseline diffs.
  - Removed hardcoded `[:10]` worker truncation in `.github/workflows/dispatcher.yml`.

### Removed
- Removed 1.45 MB bundled mock dataset `frontend/src/lib/techhouse_real_crawl.json`, slashing production JS bundle size from 2,275 kB to 825 kB.
- Removed domain-based mock intercepts (`techhouseksa.com` fixture redirects) in frontend crawler.
- Removed untrusted third-party CORS proxies (`corsproxy.io`, `api.allorigins.win`).

## [2.0.0] - 2026-10-31
### Added
- **First-Scan Baseline Report**: Comprehensive 7-section Site Report snapshot for the initial crawl, serving as permanent reference point for tracking persisting vs. new issues.
- **Issue Lifecycle Engine**: Deterministic fingerprint-based status reconciliation (`new`, `persisting`, `resolved`, `reappeared`, `ignored`) tracking days open and marking baseline issues.
- **Smart URL Sanitizer**: Trims whitespace padding, `%20`, `\xa0`, double slashes, bidi control characters, and normalizes Arabic Unicode (NFC) before reporting any 404.
- **Slug Recovery Engine**: RapidFuzz Levenshtein and prefix/truncation detection for recoverable 404 slugs with confidence scoring.
- **Redirect Chain Collapse & Rule Generator**: Automated valid Nginx rewrite and `.htaccess` RewriteRule generators with character escaping.
- **Content Freshness & CTR Analyzers**: Year Pattern Scanner (target year 2027), title/meta description length & CTR keyword triggers (Arabic and English), thin content detection.
- **Structured Data Gaps & Real FAQ Generator**: Extracts real question-and-answer pairs ending in question marks from page HTML to produce valid FAQPage JSON-LD.
- **Taxonomy Classifier**: Path and content-based classification into programs/guides, blog articles, landing pages, category listings, and other.
- **Action Plans**: Rule-based deterministic single-sentence remediation plan with priority scores and effort estimates.
- **Local Runner & Fixture Website**: Local developer scheduler, CLI (`--scan`, `--baseline`, `--daily`, `--simulate-day +1`, `--verify`), fixture server on `localhost:8099` with Day 1 baseline and Day 2 regression states, and `.local/outbox/` email persistence.
- **Accuracy Verification**: `verify_report` invariant checker asserting `total_discovered == total_crawled + total_skipped`, classification completeness, non-empty evidence, and `--live-sample N` ground-truth check.
- **Database Migration**: `20261031000000_first_scan_baseline_schema.sql` adding `scans`, `scan_urls`, `issues` lifecycle/fingerprint fields, `issue_events`, `redirect_rules`, `report_snapshots`, and safely archiving `subdomain_records`.

### Changed
- Consolidated sidebar navigation to **Overview, Site Report, Issues, Pages, History, Settings** (plus Admin if admin).
- Removed standalone product areas: Sitemap, Structured Data, Titles & Metadata, Canonicals, Content Cannibalization, and Subdomains.
- Upgraded Issues page with lifecycle tabs (`New`, `Still Open`, `Resolved`, `Ignored`), days open badges, and detailed evidence drawer.
- Updated Settings page with schedule, email policy, analysis thresholds (target year, word count, hops, confidence), and feature flags.

### Removed
- `engine/checks/check_subdomains.py` and obsolete `GenericCheckPage.tsx`.

## [1.0.0] - 2026-10-25
### Added
- Initial project architecture and monorepo structure.
- AGENTS.md engineering rules and system conventions.
- White & Gold design tokens with Inter and IBM Plex Sans Arabic typography.
- Brand assets setup with Ismail El Asiouty's official logo.
- Supabase relational schema with strict RLS and max 5 projects per user limit.
- Modular Python detection engine with 7 core checks and plugin registry.
- Similarity clustering with R script and Python TF-IDF fallback.
- Jinja2 responsive delta-only email templates (HTML + plain text).
- GitHub Actions workflows for hourly cron dispatching, matrix sharding, keepalive, and CI.
- React + Vite + TypeScript dashboard with Ubersuggest & GSC inspired UX.
