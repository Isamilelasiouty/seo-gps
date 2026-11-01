-- ============================================================================
-- SEO GPS: First-Scan Baseline Report + Persistent/New Issue Tracking Schema
-- Architect: Ismail El Asiouty
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Archive & Remove Subdomain Check Artifacts
-- ----------------------------------------------------------------------------
-- Safely drop old check constraint on issues.category that included 'subdomains'
ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS issues_category_check;
ALTER TABLE public.issues ADD CONSTRAINT issues_category_check 
    CHECK (category IN ('status', 'canonical', 'metadata', 'sitemap', 'schema', 'similarity', 'quality', 'taxonomy'));

-- Safely archive existing subdomain issues to 'ignored' status
UPDATE public.issues 
SET status = 'ignored' 
WHERE category = 'subdomains';

-- ----------------------------------------------------------------------------
-- 2. Scans Table (Baseline & Daily Scans with Resumable Checkpoints)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('baseline', 'daily')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
    phase TEXT NOT NULL DEFAULT 'discovery',
    checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_discovered INT NOT NULL DEFAULT 0,
    total_crawled INT NOT NULL DEFAULT 0,
    total_skipped INT NOT NULL DEFAULT 0,
    counters JSONB NOT NULL DEFAULT '{}'::jsonb,
    health_score INT NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scans_project_type ON public.scans(project_id, type);
CREATE INDEX IF NOT EXISTS idx_scans_project_status ON public.scans(project_id, status);

-- ----------------------------------------------------------------------------
-- 3. Scan URLs Table (Every Discovered & Crawled URL with Source Provenance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'internal_link' CHECK (source IN ('sitemap', 'root', 'internal_link', 'imported')),
    found_on TEXT,
    status_code INT,
    final_url TEXT,
    redirect_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
    content_type TEXT,
    response_ms INT DEFAULT 0,
    canonical TEXT,
    robots TEXT,
    title TEXT,
    meta_description TEXT,
    h1 TEXT,
    word_count INT DEFAULT 0,
    schema_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    content_hash TEXT,
    page_type TEXT NOT NULL DEFAULT 'other' CHECK (page_type IN ('guides_and_fees', 'blog_guide', 'landing_page', 'listing', 'other')),
    classification TEXT NOT NULL DEFAULT 'blocked_unverified' 
        CHECK (classification IN (
            '200_ok', 
            'redirect_301', 
            'redirect_302_307', 
            'redirect_308', 
            'not_found_404', 
            'gone_410', 
            'server_error_5xx', 
            'timeout', 
            'blocked_unverified', 
            'soft_404', 
            'skipped'
        )),
    skip_reason TEXT,
    is_indexable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_urls_scan_id ON public.scan_urls(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_urls_project_url ON public.scan_urls(project_id, normalized_url);
CREATE INDEX IF NOT EXISTS idx_scan_urls_classification ON public.scan_urls(classification);

-- ----------------------------------------------------------------------------
-- 4. Extend Issues Table (Fingerprints & Lifecycle Tracking)
-- ----------------------------------------------------------------------------
ALTER TABLE public.issues 
    ADD COLUMN IF NOT EXISTS fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS confidence TEXT NOT NULL DEFAULT 'high' CHECK (confidence IN ('high', 'medium', 'low')),
    ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS first_seen_scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_seen_scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolved_scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS days_open INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN NOT NULL DEFAULT false;

-- Update status check constraint to support full lifecycle
ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS issues_status_check;
ALTER TABLE public.issues ADD CONSTRAINT issues_status_check 
    CHECK (status IN ('new', 'persisting', 'resolved', 'reappeared', 'ignored', 'open'));

CREATE INDEX IF NOT EXISTS idx_issues_fingerprint ON public.issues(project_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_issues_lifecycle ON public.issues(project_id, status, is_baseline);

-- ----------------------------------------------------------------------------
-- 5. Issue Events Table (Historical Timeline of Transitions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.issue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('detected', 'persisted', 'resolved', 'reappeared', 'ignored', 'unignored')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_events_issue_id ON public.issue_events(issue_id);

-- ----------------------------------------------------------------------------
-- 6. Redirect Rules Table (Auto-generated Nginx / .htaccess Snippets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redirect_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('chain_collapse', 'legacy_migration', 'dead_page_redirect')),
    source_pattern TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status_code INT NOT NULL DEFAULT 301,
    nginx_snippet TEXT NOT NULL,
    htaccess_snippet TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redirect_rules_project ON public.redirect_rules(project_id);

-- ----------------------------------------------------------------------------
-- 7. Report Snapshots Table (Instant, Identical Report Opening)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    scan_id UUID NOT NULL UNIQUE REFERENCES public.scans(id) ON DELETE CASCADE,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_redirects JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_onpage JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_cannibalization JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
    section_action_plans JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_fixes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_project ON public.report_snapshots(project_id);

-- ----------------------------------------------------------------------------
-- 8. Extend Project Settings with New Configuration Fields
-- ----------------------------------------------------------------------------
ALTER TABLE public.project_settings
    ADD COLUMN IF NOT EXISTS extra_urls TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS target_year INT DEFAULT 2027,
    ADD COLUMN IF NOT EXISTS ctr_keywords JSONB NOT NULL DEFAULT '["fees", "admission", "requirements", "steps", "guide", "pricing", "cost", "شروط", "رسوم", "خطوات", "مصاريف", "دليل"]'::jsonb,
    ADD COLUMN IF NOT EXISTS taxonomy_rules JSONB NOT NULL DEFAULT '{
        "guides_and_fees": ["/guide", "/fees", "/admission", "/requirements", "/programs", "/courses"],
        "blog_guide": ["/blog", "/article", "/news", "/post"],
        "landing_page": ["/landing", "/start", "/apply"],
        "listing": ["/category", "/programs-list", "/all-"]
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS word_count_threshold INT NOT NULL DEFAULT 250,
    ADD COLUMN IF NOT EXISTS max_hops INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS slug_confidence_threshold NUMERIC NOT NULL DEFAULT 0.60,
    ADD COLUMN IF NOT EXISTS email_policy TEXT NOT NULL DEFAULT 'every_run' CHECK (email_policy IN ('every_run', 'on_changes')),
    ADD COLUMN IF NOT EXISTS gsc_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS llm_polish_enabled BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 9. Row Level Security Policies for New Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirect_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scans of their projects"
ON public.scans FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can view scan_urls of their projects"
ON public.scan_urls FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can view issue_events of their projects"
ON public.issue_events FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can view redirect_rules of their projects"
ON public.redirect_rules FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can view report_snapshots of their projects"
ON public.report_snapshots FOR SELECT
USING (public.user_owns_project(project_id));
