# AGENTS.md — Developer & AI Agent Working Agreement

This repository is **SEO GPS**, a portfolio-grade commercial SEO Regression Monitoring SaaS designed and created by **Ismail El Asiouty**.

> **Golden Rule for All Agents & Engineers:**
> *"Make the smallest change that satisfies the request. Do not refactor unrelated code. Never rewrite working modules. Add a migration for any schema change. Update CHANGELOG.md."*

---

## 1. Architecture Map

```
/
├── frontend/               # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── public/brand/       # Official brand assets (logo, favicons)
│   ├── src/
│   │   ├── components/     # UI primitives, layout, widgets, charts
│   │   ├── pages/          # Dashboard, Issues, Pages, History, Settings, Auth
│   │   ├── i18n/           # Translation dictionaries (ar.json, en.json)
│   │   ├── lib/            # Supabase client, API clients, utilities
│   │   └── tokens.css      # Design tokens (White & Gold, typography)
├── engine/                 # Python 3.11+ async crawler & audit pipeline
│   ├── checks/             # ONE FILE PER CHECK, auto-discovered & registered
│   │   ├── base.py         # Abstract BaseCheck and Issue dataclass
│   │   ├── registry.py     # Check discovery & registry loader
│   │   └── ...             # Check modules
│   ├── analytics/          # Similarity clustering: R script + Python fallback
│   ├── mail/               # Jinja2 responsive HTML/text email templates
│   ├── crawler.py          # Polite async crawler (httpx, selectolax/BeautifulSoup)
│   ├── diff.py             # Deterministic snapshot comparison engine
│   └── tests/              # Pytest suite & regression test fixture server
├── supabase/
│   ├── migrations/         # Versioned SQL migrations (immutable once committed)
│   └── functions/          # Deno/TypeScript Edge Functions (run-now, verify-domain)
├── .github/workflows/      # Automation: hourly-dispatcher, matrix-crawl, keepalive, deploy
├── mcp/                    # Read-only Model Context Protocol server for Claude
├── docs/                   # Full documentation (Architecture, Adding checks, Security, Limits)
├── AGENTS.md               # This file
├── CHANGELOG.md            # Release & modification history
└── .env.example            # Environment variables specification
```

---

## 2. Folder & Coding Conventions

- **Engine Checks (`engine/checks/`)**: Every check must be self-contained in a single file inheriting from `BaseCheck`. It must define `id`, `title`, `category`, `default_severity`, and `analyze(current, previous, context) -> list[Issue]`.
- **Database Migrations (`supabase/migrations/`)**: Never edit an already applied migration. Always append a new timestamped file: `YYYYMMDDHHMMSS_description.sql`.
- **Frontend Components (`frontend/src/components/`)**: Functional components with TypeScript interfaces. Never hardcode strings; always use translation keys (`t('key')`).
- **Typography & Accessibility**:
  - Latin Font: **Inter**
  - Arabic Font: **IBM Plex Sans Arabic**
  - Minimum body text: 15px with line-height 1.6-1.7 for maximum reading comfort.
  - Strict WCAG AA contrast ratio compliance.
- **RTL / LTR**: Seamless bidirectional support. The layout automatically flips when language is set to Arabic.

---

## 3. Design Tokens (White & Gold)

```css
--bg-main: #FFFFFF;
--bg-surface: #FAFAF7;
--bg-gold-tint: #FBF5E4;
--primary-gold: #B8892B;
--primary-gold-hover: #9A7220;
--border-gold: #E9D9A8;
--border-hairline: #ECE8DC;
--text-ink: #16140F;
--text-muted: #6B665A;

/* Severity Tokens */
--color-critical: #B42318;
--color-warning: #B54708;
--color-notice: #175CD3;
--color-healthy: #067647;
```

---

## 4. How to Add a New Check

1. Create a new file in `engine/checks/check_<name>.py`.
2. Inherit from `BaseCheck` and implement the required abstract methods.
3. The check registry auto-discovers it automatically without editing any core pipeline file.
4. Add corresponding translation keys in `frontend/src/i18n/{en,ar}.json`.
5. Add a test in `engine/tests/`.

---

## 5. How to Add a Dashboard Page

1. Create the page component in `frontend/src/pages/<PageName>.tsx`.
2. Add route in `frontend/src/App.tsx`.
3. Add navigation entry in `frontend/src/components/Sidebar.tsx`.
4. Ensure both EN and AR translations are provided.

---

## 6. Do NOT Touch Areas

- Do not rewrite existing working checks in `engine/checks/`.
- Do not alter applied SQL migrations in `supabase/migrations/`.
- Do not remove or alter the RLS (Row Level Security) policies without explicit review.
- Do not introduce paid dependencies, heavy headless browsers (Puppeteer/Playwright in cron), or credit-card requiring services.
