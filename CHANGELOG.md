# Changelog

All notable changes to the **SEO GPS** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
