# SEO GPS: Local Test Guide

> **Author**: Ismail El Asiouty  
> **Branch**: `feature/first-scan-report` (Strictly local-first, zero remote cloud calls)

---

## 1. Quick Start (1 Command)

Open your terminal in `D:\SEO GPS`:

```bash
# Option A: Start Local Environment (Fixture Server + Initial Baseline Scan)
python -m engine.local_runner --start

# Option B: Start Frontend Development Server (in a second terminal)
npm run local
```

The application will be live at:
- **Dashboard UI**: [http://localhost:5173](http://localhost:5173)
- **Local Fixture Site**: [http://127.0.0.1:8099](http://127.0.0.1:8099)
- **Local Email Outbox**: `.local/outbox/`
- **Local SQLite DB**: `.local/seo_gps.db`

---

## 2. Step-by-Step Verification Workflow

### Step 1: Run Baseline Scan on Fixture Website
The fixture website simulates every real-world edge case: false 404s, truncated Arabic slugs, redirect chains, outdated years (2024), schema gaps with real FAQ content, soft 404s, and thin content.

Run the baseline scan via CLI or Dashboard:
```bash
python -m engine.local_runner --scan http://127.0.0.1:8099/ --baseline
```
**Expected Result**:
- Discovered: 27 URLs, Crawled: 27 URLs, Skipped: 0 URLs.
- Accuracy verification passes (`total_discovered == total_crawled + total_skipped`).
- First Scan Baseline Report email written to `.local/outbox/`.

---

### Step 2: Open and Inspect the Site Report in the Dashboard
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Click **Site Report** (`تقرير الموقع`) in the sidebar.
3. Verify each section:
   - **Executive Summary**: Baseline Health Score gauge, status breakdown, and Top 10 Priority Fixes.
   - **Section A (Status & 404)**:
     - Notice the **False 404** detected on `/%20false-404-leading-space` with defect "leading whitespace" and clean target `/false-404-leading-space`.
     - Notice the **Recoverable Arabic Slug** on `/arabic-slug-دليل-القب` matched to `/arabic-slug-دليل-القبول` with 92% confidence.
     - Notice the **True Dead Page** on `/true-dead-page-xyz` with 301 suggestion.
   - **Section B (Redirects)**:
     - 3-hop redirect chain (`/chain-step-1` &rarr; `/chain-step-2` &rarr; `/chain-step-3` &rarr; `/programs/computer-science`).
     - Click **Copy Action** or copy the generated **Nginx** or **.htaccess** rewrite rules.
   - **Section C (Live 200 Pages & Freshness)**:
     - Outdated year 2024 flagged on `/programs/medicine` with suggestion to update to **2027**.
     - Weak CTR trigger warnings.
   - **Section D (Cannibalization)**:
     - Topic cluster between Article A & Article B proposing Article A as Master.
   - **Section E (Structured Data Gaps)**:
     - FAQPage schema gap on `/programs/business` showing 2 detected questions and valid generated JSON-LD.
   - **Section F (Taxonomy)**:
     - Categorization of URLs into Guides, Blog, Landing, Category, and Other.
   - **Section G (Action Plans)**:
     - Single deterministic sentence for each diagnosed URL.
4. Click **Export CSV** to download the full report.

---

### Step 3: Simulate Day 2 (Time-Travel Regression Re-Scan)
Simulate the passage of time where some issues are fixed, some persist, and new regressions emerge:

```bash
python -m engine.local_runner --simulate-day +1
```

**Expected Result**:
- Fixture site state shifts to Day 2:
  - `/true-dead-page-xyz` is restored &rarr; **Resolved**!
  - `/new-broken-link` (404) appears &rarr; **New**!
  - `/programs/medicine` still has year 2024 &rarr; **Still Open** (marked with days open and "Baseline")!
- Daily Alert email is written to `.local/outbox/` with subject:  
  `[SEO GPS] 127.0.0.1:8099: X new, Y still open, 1 resolved, ...`

---

### Step 4: Verify Email Outbox & In-App Preview
1. Check `.local/outbox/` on disk:
   - Contains `.html` and `.json` files for both the Baseline Report and Daily Alert emails.
2. In the Dashboard:
   - Click **History** in the sidebar.
   - Click **Email Preview** on any scan row to view the email in an interactive modal.
   - Click **Site Report** to open that scan's exact historical report snapshot.

---

### Step 5: Test on a Real Website
You can test any real public website locally:
```bash
python -m engine.local_runner --scan https://example.com/ --baseline
```
Or click **Add Website** in the Dashboard:
- Enter Website Name and Root URL.
- (Optional) Enter Sitemap URL.
- (Optional) In **Extra URLs to check**, paste specific URLs or upload a TXT/CSV export of 404s.
- Click Add & Run First Scan.

---

### Step 6: Run Automated Accuracy Verification
Run the invariant verifier and live ground-truth re-check:
```bash
python -m engine.local_runner --verify 127.0.0.1:8099 --live-sample 5
```
**Expected Result**:
- Structural Invariants: **PASSED**
- Live Sample Ground-Truth Check: **PASSED** (0 mismatches across sampled URLs)

---

## 3. Checklist: What to Check by Hand

| Item to Test | How to Test | Expected Result | Status |
|---|---|---|---|
| **Clean Sidebar Navigation** | Look at sidebar | Only 6 items: Overview, Site Report, Issues, Pages, History, Settings (+ Admin) | Passed |
| **False 404 Sanitizer** | Check Section A in Site Report | Leading `%20` detected, clean URL resolved, fix suggested | Passed |
| **Arabic Slug Recovery** | Check Section A in Site Report | Truncated Arabic slug matched with >60% confidence | Passed |
| **Nginx / .htaccess Generators** | Check Section B in Site Report | Valid rewrite syntax, copy button works | Passed |
| **Year Pattern Scanner** | Check Section C in Site Report | Past year 2024 flagged, replacement year is **2027** | Passed |
| **Real FAQ JSON-LD** | Check Section E in Site Report | Valid JSON-LD built strictly from HTML questions | Passed |
| **Day 2 Reconciliation** | Run `--simulate-day +1` | Dead page resolved, new broken link marked new, baseline issues marked persisting | Passed |
| **Email Outbox** | Check `.local/outbox/` | Responsive HTML and text files created | Passed |
| **Reconciliation Invariant** | Run `pytest` or `--verify` | `total_discovered == total_crawled + total_skipped` (0 dropped) | Passed |
