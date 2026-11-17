-- Migration: 20261118000000_resumable_frontier.sql
-- Description: Persistent, lease-based URL frontier for resumable 1M-page crawls

CREATE TABLE IF NOT EXISTS crawl_frontier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url_hash CHAR(64) NOT NULL,
    url TEXT NOT NULL,
    depth INT NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL DEFAULT 'link', -- sitemap, root, link, imported, redirect
    found_on TEXT,
    state VARCHAR(24) NOT NULL DEFAULT 'pending', -- pending, leased, done, failed, blocked_by_robots, skipped
    lease_until TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    status_code INT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_scan_url UNIQUE(scan_id, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_frontier_lease 
ON crawl_frontier (scan_id, state, lease_until) 
WHERE state IN ('pending', 'leased');

CREATE INDEX IF NOT EXISTS idx_frontier_lookup 
ON crawl_frontier (scan_id, url_hash);

CREATE INDEX IF NOT EXISTS idx_frontier_scan_state
ON crawl_frontier (scan_id, state);

-- Atomic batch lease RPC function using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION lease_frontier_batch(
    p_scan_id UUID,
    p_batch_size INT,
    p_lease_seconds INT
)
RETURNS TABLE (
    id UUID,
    url TEXT,
    depth INT,
    source VARCHAR,
    found_on TEXT,
    attempts INT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH available AS (
        SELECT cf.id
        FROM crawl_frontier cf
        WHERE cf.scan_id = p_scan_id
          AND (
              cf.state = 'pending' 
              OR (cf.state = 'leased' AND cf.lease_until < NOW())
          )
          AND cf.attempts < 3
        ORDER BY cf.depth ASC, cf.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE crawl_frontier target
    SET state = 'leased',
        lease_until = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
        attempts = target.attempts + 1,
        updated_at = NOW()
    FROM available
    WHERE target.id = available.id
    RETURNING target.id, target.url, target.depth, target.source, target.found_on, target.attempts;
END;
$$;
