# Architectural Decisions & Assumptions (feature/first-scan-report)

This document tracks all design decisions and assumptions made during the implementation of the First-Scan Baseline Report and Persistent/New Issue Tracking feature update, in accordance with Section 0 of the update specification.

---

## 1. Local-First Architecture & Database Parity (Section 0, Section 9)
- **Decision**: Development and testing run strictly on `localhost`. No calls to remote Supabase, Resend, or GitHub APIs are made during development.
- **Implementation**:
  - We create versioned SQL migration `20261031000000_first_scan_baseline_schema.sql` for PostgreSQL/Supabase.
  - For local zero-dependency testing, we provide a unified storage engine (`engine/storage.py`) that operates on standard SQLite with full schema parity (tables: `projects`, `scans`, `scan_urls`, `issues`, `issue_events`, `redirect_rules`, `report_snapshots`) as well as Supabase/PostgreSQL when configured.
  - A local dev runner (`engine/local_runner.py`) orchestrates the fixture server, local API/scheduler, and email outbox so the whole application can be launched with a single command (`npm run local`).

## 2. Feature Removal & Analyzer Reorganization (Section 1)
- **Decision**: The standalone navigation items, routes, and pages for Sitemap, Structured Data, Titles & Metadata, Canonicals, Content Cannibalization, and Subdomains are removed.
- **Subdomains Feature**: The entire subdomain exposure check (`check_subdomains.py`), Certificate Transparency lookup logic, and associated database references are permanently removed.
- **Analyzers**: Analysis for status codes, canonicals, metadata, schema gaps, and cannibalization is preserved and refactored into internal analyzers (`engine/checks/` and `engine/analyzer.py`) that feed both the unified **Site Report** and the **Issues** hub.
- **Sidebar**: The new sidebar strictly presents:
  1. `Overview`
  2. `Site Report`
  3. `Issues`
  4. `Pages`
  5. `History`
  6. `Settings`
  (Plus `Admin Analytics` when logged in as platform administrator).

## 3. Date & Year Scanner (Section 3.C)
- **Decision**: The specification mandates `target_year` to be configurable per project, defaulting to current year, or next year from October onward. Since current local time is October 2026, the default `target_year` is set to **2027**.
- **Replacement Suggestion**: Detects outdated years (e.g. 2023, 2024, 2025, 2026) in title, H1, meta description, and body, and suggests replacing them with the target year.

## 4. Issue Fingerprinting & Lifecycle Transitions (Section 2, Section 5)
- **Fingerprint Formula**: `sha256(f"{check_id}:{normalized_url}:{defining_attributes}")`.
- **Status Lifecycle**:
  - `new`: Issue was not present in the baseline or any prior scan.
  - `persisting`: Issue was present in an earlier scan and remains active (`is_baseline=True` if present since first scan, with `days_open` calculated).
  - `resolved`: Issue was active in the immediately prior scan but is absent in the current scan.
  - `reappeared`: Issue was previously resolved but has recurred in the current scan.
  - `ignored`: Issue has been manually ignored by user.
- **Idempotency**: Running reconciliation multiple times on the same scan state produces identical fingerprints and lifecycle counters without duplication or state flip.

## 5. Accuracy Standard & Two-Step Verification (Section 6)
- **Two-Step Verification**: Before classifying any URL as 404, 410, 5xx, or timeout:
  1. URL is passed through the Smart URL Sanitizer.
  2. If still unresolving, it is re-requested after a polite pause using an alternate standard browser User-Agent.
  3. Transient network or WAF challenges (403/429) are classified as `blocked_unverified` or `timeout`, never as dead 404s.
- **Evidence Guarantee**: Every issue records the exact HTTP request URL, sanitized URL, final URL, redirect hops, response headers, timestamp, User-Agent, and source discovery context.
- **Reconciliation Invariant**: `total_discovered == total_crawled + total_skipped`. The sum of all final URL classifications matches `total_discovered`.

## 6. Email Delivery in Local Mode (Section 7, Section 9)
- **Decision**: In local mode, outgoing transactional emails (First Scan Report & Daily Alert) are serialized to `.local/outbox/{timestamp}_{recipient}_{subject}.json` and rendered as `.html`.
- **In-App Preview**: The frontend includes a local email inspector component/page allowing immediate visual verification of rendered emails.

## 7. Optional Modules (Section 4)
- Google Search Console module and LLM polish module plumbing are constructed behind feature flags in `project_settings` (`gsc_enabled = false`, `llm_polish_enabled = false`).
