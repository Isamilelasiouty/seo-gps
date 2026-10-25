-- ============================================================================
-- SEO GPS: Initial Database Schema with Strict RLS and Max 5 Projects Enforcement
-- Architect: Ismail El Asiouty
-- ============================================================================

-- Enable pgcrypto for UUIDs & hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Projects Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    root_url TEXT NOT NULL,
    sitemap_url TEXT,
    favicon_url TEXT,
    daily_crawl_hour INT NOT NULL DEFAULT 6 CHECK (daily_crawl_hour BETWEEN 0 AND 23),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_method TEXT CHECK (verification_method IN ('meta_tag', 'dns_txt', 'file')),
    verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    last_run_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    health_score INT NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: Enforce max 5 projects per user
CREATE OR REPLACE FUNCTION public.check_user_project_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.projects WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Project limit reached: Maximum of 5 projects allowed per user.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_5_projects
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.check_user_project_limit();

-- ----------------------------------------------------------------------------
-- 2. Project Settings Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
    recipient_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    notify_critical BOOLEAN NOT NULL DEFAULT true,
    notify_warning BOOLEAN NOT NULL DEFAULT true,
    notify_notice BOOLEAN NOT NULL DEFAULT false,
    weekly_digest BOOLEAN NOT NULL DEFAULT false,
    ignore_query_strings BOOLEAN NOT NULL DEFAULT true,
    ignore_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
    similarity_threshold NUMERIC NOT NULL DEFAULT 0.85,
    max_pages INT NOT NULL DEFAULT 2000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: Automatically create project settings when a project is created
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.project_settings (project_id, recipient_emails)
    VALUES (NEW.id, jsonb_build_array((SELECT email FROM auth.users WHERE id = NEW.user_id)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_project();

-- ----------------------------------------------------------------------------
-- 3. Audit Runs Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    pages_crawled INT NOT NULL DEFAULT 0,
    pages_indexable INT NOT NULL DEFAULT 0,
    critical_issues_count INT NOT NULL DEFAULT 0,
    warning_issues_count INT NOT NULL DEFAULT 0,
    notice_issues_count INT NOT NULL DEFAULT 0,
    resolved_issues_count INT NOT NULL DEFAULT 0,
    health_score INT NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ----------------------------------------------------------------------------
-- 4. Snapshots Table (Compact storage for zero-cost budget)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.audit_runs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status_code INT,
    response_time_ms INT,
    canonical_url TEXT,
    title TEXT,
    title_hash TEXT,
    description TEXT,
    description_hash TEXT,
    robots_meta TEXT,
    x_robots_tag TEXT,
    is_indexable BOOLEAN NOT NULL DEFAULT true,
    schema_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    schema_hash TEXT,
    content_hash TEXT,
    similarity_fingerprint TEXT,
    h1_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_project_url ON public.snapshots(project_id, url);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON public.snapshots(created_at);

-- ----------------------------------------------------------------------------
-- 5. Issues Table (Plugin-driven generic issues)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    check_id TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'notice', 'healthy')),
    category TEXT NOT NULL CHECK (category IN ('status', 'canonical', 'metadata', 'sitemap', 'schema', 'subdomains', 'similarity')),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_project_status ON public.issues(project_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_check_id ON public.issues(check_id);

-- ----------------------------------------------------------------------------
-- 6. Feature Flags Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    is_enabled_globally BOOLEAN NOT NULL DEFAULT false,
    enabled_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. Email Logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    deltas_count INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: user owns project
CREATE OR REPLACE FUNCTION public.user_owns_project(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Projects Policies
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- 2. Project Settings Policies
CREATE POLICY "Users can view settings of their projects"
ON public.project_settings FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can update settings of their projects"
ON public.project_settings FOR UPDATE
USING (public.user_owns_project(project_id))
WITH CHECK (public.user_owns_project(project_id));

-- 3. Audit Runs Policies
CREATE POLICY "Users can view audit runs of their projects"
ON public.audit_runs FOR SELECT
USING (public.user_owns_project(project_id));

-- 4. Snapshots Policies
CREATE POLICY "Users can view snapshots of their projects"
ON public.snapshots FOR SELECT
USING (public.user_owns_project(project_id));

-- 5. Issues Policies
CREATE POLICY "Users can view issues of their projects"
ON public.issues FOR SELECT
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can update issue status of their projects"
ON public.issues FOR UPDATE
USING (public.user_owns_project(project_id))
WITH CHECK (public.user_owns_project(project_id));

-- 6. Feature Flags Policies (Public read for active flags)
CREATE POLICY "Users can read feature flags"
ON public.feature_flags FOR SELECT
USING (true);

-- 7. Email Logs Policies
CREATE POLICY "Users can view email logs of their projects"
ON public.email_logs FOR SELECT
USING (public.user_owns_project(project_id));
