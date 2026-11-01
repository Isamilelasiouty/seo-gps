"""
Local-First Storage Engine for SEO GPS with SQLite & PostgreSQL Parity.
Author: Ismail El Asiouty
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


LOCAL_DIR = Path("D:/SEO GPS/.local")
DEFAULT_DB_PATH = LOCAL_DIR / "seo_gps.db"


class LocalStorage:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                domain TEXT NOT NULL,
                root_url TEXT NOT NULL,
                sitemap_url TEXT,
                favicon_url TEXT,
                daily_crawl_hour INTEGER NOT NULL DEFAULT 6,
                timezone TEXT NOT NULL DEFAULT 'UTC',
                is_verified INTEGER NOT NULL DEFAULT 0,
                verification_method TEXT,
                verification_token TEXT NOT NULL,
                last_run_at TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                health_score INTEGER NOT NULL DEFAULT 100,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS project_settings (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL UNIQUE,
                recipient_emails TEXT NOT NULL DEFAULT '[]',
                notify_critical INTEGER NOT NULL DEFAULT 1,
                notify_warning INTEGER NOT NULL DEFAULT 1,
                notify_notice INTEGER NOT NULL DEFAULT 0,
                weekly_digest INTEGER NOT NULL DEFAULT 0,
                ignore_query_strings INTEGER NOT NULL DEFAULT 1,
                ignore_patterns TEXT NOT NULL DEFAULT '[]',
                similarity_threshold REAL NOT NULL DEFAULT 0.85,
                max_pages INTEGER NOT NULL DEFAULT 2000,
                extra_urls TEXT DEFAULT '',
                target_year INTEGER DEFAULT 2027,
                ctr_keywords TEXT NOT NULL DEFAULT '[]',
                taxonomy_rules TEXT NOT NULL DEFAULT '{}',
                word_count_threshold INTEGER NOT NULL DEFAULT 250,
                max_hops INTEGER NOT NULL DEFAULT 5,
                slug_confidence_threshold REAL NOT NULL DEFAULT 0.60,
                email_policy TEXT NOT NULL DEFAULT 'every_run',
                gsc_enabled INTEGER NOT NULL DEFAULT 0,
                llm_polish_enabled INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                phase TEXT NOT NULL DEFAULT 'discovery',
                checkpoint TEXT NOT NULL DEFAULT '{}',
                total_discovered INTEGER NOT NULL DEFAULT 0,
                total_crawled INTEGER NOT NULL DEFAULT 0,
                total_skipped INTEGER NOT NULL DEFAULT 0,
                counters TEXT NOT NULL DEFAULT '{}',
                health_score INTEGER NOT NULL DEFAULT 100,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS scan_urls (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                url TEXT NOT NULL,
                normalized_url TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'internal_link',
                found_on TEXT,
                status_code INTEGER,
                final_url TEXT,
                redirect_chain TEXT NOT NULL DEFAULT '[]',
                content_type TEXT,
                response_ms INTEGER DEFAULT 0,
                canonical TEXT,
                robots TEXT,
                title TEXT,
                meta_description TEXT,
                h1 TEXT,
                word_count INTEGER DEFAULT 0,
                schema_types TEXT NOT NULL DEFAULT '[]',
                content_hash TEXT,
                page_type TEXT NOT NULL DEFAULT 'other',
                classification TEXT NOT NULL DEFAULT 'blocked_unverified',
                skip_reason TEXT,
                is_indexable INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS issues (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                check_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                url TEXT NOT NULL,
                title TEXT NOT NULL,
                details TEXT,
                before_state TEXT NOT NULL DEFAULT '{}',
                after_state TEXT NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'new',
                fingerprint TEXT NOT NULL,
                confidence TEXT NOT NULL DEFAULT 'high',
                evidence TEXT NOT NULL DEFAULT '{}',
                suggestion TEXT NOT NULL DEFAULT '{}',
                days_open INTEGER NOT NULL DEFAULT 0,
                is_baseline INTEGER NOT NULL DEFAULT 0,
                first_seen_scan_id TEXT,
                last_seen_scan_id TEXT,
                resolved_scan_id TEXT,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                resolved_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS issue_events (
                id TEXT PRIMARY KEY,
                issue_id TEXT NOT NULL,
                scan_id TEXT,
                project_id TEXT NOT NULL,
                from_status TEXT,
                to_status TEXT NOT NULL,
                event_type TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS redirect_rules (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                scan_id TEXT NOT NULL,
                rule_type TEXT NOT NULL,
                source_pattern TEXT NOT NULL,
                target_url TEXT NOT NULL,
                status_code INTEGER NOT NULL DEFAULT 301,
                nginx_snippet TEXT NOT NULL,
                htaccess_snippet TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS report_snapshots (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                scan_id TEXT NOT NULL UNIQUE,
                summary TEXT NOT NULL DEFAULT '{}',
                section_status TEXT NOT NULL DEFAULT '{}',
                section_redirects TEXT NOT NULL DEFAULT '{}',
                section_onpage TEXT NOT NULL DEFAULT '{}',
                section_cannibalization TEXT NOT NULL DEFAULT '{}',
                section_schema TEXT NOT NULL DEFAULT '{}',
                section_taxonomy TEXT NOT NULL DEFAULT '{}',
                section_action_plans TEXT NOT NULL DEFAULT '[]',
                top_fixes TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS email_logs (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                recipient TEXT NOT NULL,
                subject TEXT NOT NULL,
                status TEXT NOT NULL,
                deltas_count INTEGER NOT NULL DEFAULT 0,
                sent_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """)

    # -------------------------------------------------------------------------
    # Project CRUD
    # -------------------------------------------------------------------------
    def save_project(self, project: Dict[str, Any]) -> str:
        p_id = project.get("id") or str(uuid.uuid4())
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO projects (id, user_id, name, domain, root_url, sitemap_url, favicon_url, daily_crawl_hour, timezone, is_verified, verification_token, last_run_at, status, health_score, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                domain=excluded.domain,
                root_url=excluded.root_url,
                sitemap_url=excluded.sitemap_url,
                daily_crawl_hour=excluded.daily_crawl_hour,
                timezone=excluded.timezone,
                last_run_at=excluded.last_run_at,
                health_score=excluded.health_score,
                updated_at=excluded.updated_at;
            """, (
                p_id,
                project.get("user_id", "local_user_1"),
                project["name"],
                project["domain"],
                project["root_url"],
                project.get("sitemap_url"),
                project.get("favicon_url"),
                project.get("daily_crawl_hour", 6),
                project.get("timezone", "UTC"),
                1 if project.get("is_verified") else 0,
                project.get("verification_token", "token_local"),
                project.get("last_run_at"),
                project.get("status", "active"),
                project.get("health_score", 100),
                project.get("created_at", now),
                now,
            ))

            # Ensure default project settings
            settings = project.get("settings", {})
            conn.execute("""
            INSERT INTO project_settings (id, project_id, recipient_emails, extra_urls, target_year, email_policy, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET
                extra_urls=excluded.extra_urls,
                target_year=excluded.target_year,
                email_policy=excluded.email_policy,
                updated_at=excluded.updated_at;
            """, (
                str(uuid.uuid4()),
                p_id,
                json.dumps(settings.get("recipient_emails", ["local@example.com"])),
                settings.get("extra_urls", ""),
                settings.get("target_year", 2027),
                settings.get("email_policy", "every_run"),
                now,
                now,
            ))
        return p_id

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
            if not row:
                return None
            p = dict(row)
            settings_row = conn.execute("SELECT * FROM project_settings WHERE project_id = ?", (project_id,)).fetchone()
            if settings_row:
                s = dict(settings_row)
                s["recipient_emails"] = json.loads(s.get("recipient_emails", "[]"))
                s["ctr_keywords"] = json.loads(s.get("ctr_keywords", "[]"))
                s["taxonomy_rules"] = json.loads(s.get("taxonomy_rules", "{}"))
                p["settings"] = s
            return p

    def list_projects(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            if user_id:
                rows = conn.execute("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]

    def delete_project(self, project_id: str):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM issue_events WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM issues WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM scan_urls WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM scans WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM redirect_rules WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM report_snapshots WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM email_logs WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM project_settings WHERE project_id = ?", (project_id,))
            conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))

    # -------------------------------------------------------------------------
    # Scan & URL Management
    # -------------------------------------------------------------------------
    def create_scan(self, project_id: str, scan_type: str = "baseline") -> str:
        scan_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO scans (id, project_id, type, status, phase, started_at, created_at, updated_at)
            VALUES (?, ?, ?, 'running', 'discovery', ?, ?, ?)
            """, (scan_id, project_id, scan_type, now, now, now))
        return scan_id

    def update_scan(self, scan_id: str, **kwargs):
        now = datetime.now().isoformat()
        fields = []
        values = []
        for k, v in kwargs.items():
            fields.append(f"{k} = ?")
            if isinstance(v, (dict, list)):
                values.append(json.dumps(v))
            else:
                values.append(v)
        fields.append("updated_at = ?")
        values.append(now)
        values.append(scan_id)

        sql = f"UPDATE scans SET {', '.join(fields)} WHERE id = ?"
        with self.get_connection() as conn:
            conn.execute(sql, tuple(values))

    def get_scan(self, scan_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            res["checkpoint"] = json.loads(res.get("checkpoint", "{}"))
            res["counters"] = json.loads(res.get("counters", "{}"))
            return res

    def get_latest_scan(self, project_id: str, scan_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            if scan_type:
                row = conn.execute("SELECT * FROM scans WHERE project_id = ? AND type = ? AND status = 'completed' ORDER BY finished_at DESC LIMIT 1", (project_id, scan_type)).fetchone()
            else:
                row = conn.execute("SELECT * FROM scans WHERE project_id = ? AND status = 'completed' ORDER BY finished_at DESC LIMIT 1", (project_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            res["checkpoint"] = json.loads(res.get("checkpoint", "{}"))
            res["counters"] = json.loads(res.get("counters", "{}"))
            return res

    def list_scans(self, project_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM scans WHERE project_id = ? ORDER BY started_at DESC", (project_id,)).fetchall()
            result = []
            for r in rows:
                item = dict(r)
                item["counters"] = json.loads(item.get("counters", "{}"))
                result.append(item)
            return result

    def save_scan_urls(self, scan_id: str, project_id: str, pages: List[Dict[str, Any]]):
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            for p in pages:
                u_id = str(uuid.uuid4())
                conn.execute("""
                INSERT INTO scan_urls (id, scan_id, project_id, url, normalized_url, source, found_on, status_code, final_url, redirect_chain, content_type, response_ms, canonical, robots, title, meta_description, h1, word_count, schema_types, content_hash, page_type, classification, skip_reason, is_indexable, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    u_id,
                    scan_id,
                    project_id,
                    p["url"],
                    p.get("normalized_url") or p["url"],
                    p.get("source", "internal_link"),
                    p.get("found_on"),
                    p.get("status_code"),
                    p.get("final_url"),
                    json.dumps(p.get("redirect_chain", [])),
                    p.get("content_type", "text/html"),
                    p.get("response_time_ms", 0),
                    p.get("canonical_url"),
                    p.get("robots_meta"),
                    p.get("title", ""),
                    p.get("description", ""),
                    p.get("h1", ""),
                    p.get("word_count", 0),
                    json.dumps(p.get("schema_types", [])),
                    p.get("content_hash", ""),
                    p.get("page_type", "other"),
                    p.get("classification", "200_ok"),
                    p.get("skip_reason"),
                    1 if p.get("is_indexable", True) else 0,
                    now,
                ))

    def get_scan_urls(self, scan_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM scan_urls WHERE scan_id = ?", (scan_id,)).fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["redirect_chain"] = json.loads(item.get("redirect_chain", "[]"))
                item["schema_types"] = json.loads(item.get("schema_types", "[]"))
                item["is_indexable"] = bool(item.get("is_indexable"))
                res.append(item)
            return res

    # -------------------------------------------------------------------------
    # Issues & Events
    # -------------------------------------------------------------------------
    def save_issues(self, project_id: str, issues: List[Dict[str, Any]], is_baseline: bool = False):
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            if is_baseline:
                conn.execute("DELETE FROM issue_events WHERE project_id = ?", (project_id,))
                conn.execute("DELETE FROM issues WHERE project_id = ?", (project_id,))
            for iss in issues:
                i_id = iss.get("id") or str(uuid.uuid4())
                fp = iss.get("fingerprint") or ""
                conn.execute("""
                INSERT INTO issues (id, project_id, check_id, severity, category, url, title, details, before_state, after_state, status, fingerprint, confidence, evidence, suggestion, days_open, is_baseline, first_seen_scan_id, last_seen_scan_id, resolved_scan_id, first_seen_at, last_seen_at, resolved_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status=excluded.status,
                    days_open=excluded.days_open,
                    last_seen_scan_id=excluded.last_seen_scan_id,
                    last_seen_at=excluded.last_seen_at,
                    resolved_scan_id=excluded.resolved_scan_id,
                    resolved_at=excluded.resolved_at;
                """, (
                    i_id,
                    project_id,
                    iss["check_id"],
                    iss["severity"],
                    iss["category"],
                    iss["url"],
                    iss["title"],
                    iss.get("details", ""),
                    json.dumps(iss.get("before_state", {})),
                    json.dumps(iss.get("after_state", {})),
                    iss.get("status", "new"),
                    fp,
                    iss.get("confidence", "high"),
                    json.dumps(iss.get("evidence", {})),
                    json.dumps(iss.get("suggestion", {})),
                    iss.get("days_open", 0),
                    1 if iss.get("is_baseline") else 0,
                    iss.get("first_seen_scan_id"),
                    iss.get("last_seen_scan_id"),
                    iss.get("resolved_scan_id"),
                    iss.get("first_seen_at", now),
                    iss.get("last_seen_at", now),
                    iss.get("resolved_at"),
                    now,
                ))

    def get_issues(self, project_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            if status_filter and status_filter != "all":
                rows = conn.execute("SELECT * FROM issues WHERE project_id = ? AND status = ? ORDER BY severity ASC", (project_id, status_filter)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM issues WHERE project_id = ? ORDER BY severity ASC", (project_id,)).fetchall()

            res = []
            for r in rows:
                item = dict(r)
                item["before_state"] = json.loads(item.get("before_state", "{}"))
                item["after_state"] = json.loads(item.get("after_state", "{}"))
                item["evidence"] = json.loads(item.get("evidence", "{}"))
                item["suggestion"] = json.loads(item.get("suggestion", "{}"))
                item["is_baseline"] = bool(item.get("is_baseline"))
                res.append(item)
            return res

    def save_issue_events(self, events: List[Dict[str, Any]]):
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            for ev in events:
                e_id = str(uuid.uuid4())
                conn.execute("""
                INSERT INTO issue_events (id, issue_id, scan_id, project_id, from_status, to_status, event_type, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    e_id,
                    ev.get("issue_id", str(uuid.uuid4())),
                    ev.get("scan_id"),
                    ev["project_id"],
                    ev.get("from_status"),
                    ev["to_status"],
                    ev["event_type"],
                    json.dumps(ev.get("details", {})),
                    ev.get("created_at", now),
                ))

    # -------------------------------------------------------------------------
    # Report Snapshot & Redirect Rules
    # -------------------------------------------------------------------------
    def save_report_snapshot(self, snapshot: Dict[str, Any]):
        now = datetime.now().isoformat()
        snap_id = str(uuid.uuid4())
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO report_snapshots (id, project_id, scan_id, summary, section_status, section_redirects, section_onpage, section_cannibalization, section_schema, section_taxonomy, section_action_plans, top_fixes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(scan_id) DO UPDATE SET
                summary=excluded.summary,
                section_status=excluded.section_status,
                section_redirects=excluded.section_redirects,
                section_onpage=excluded.section_onpage,
                section_cannibalization=excluded.section_cannibalization,
                section_schema=excluded.section_schema,
                section_taxonomy=excluded.section_taxonomy,
                section_action_plans=excluded.section_action_plans,
                top_fixes=excluded.top_fixes;
            """, (
                snap_id,
                snapshot["project_id"],
                snapshot["scan_id"],
                json.dumps(snapshot.get("summary", {})),
                json.dumps(snapshot.get("section_status", {})),
                json.dumps(snapshot.get("section_redirects", {})),
                json.dumps(snapshot.get("section_onpage", {})),
                json.dumps(snapshot.get("section_cannibalization", {})),
                json.dumps(snapshot.get("section_schema", {})),
                json.dumps(snapshot.get("section_taxonomy", {})),
                json.dumps(snapshot.get("section_action_plans", [])),
                json.dumps(snapshot.get("top_fixes", [])),
                now,
            ))

    def get_report_snapshot(self, scan_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM report_snapshots WHERE scan_id = ?", (scan_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            res["summary"] = json.loads(res.get("summary", "{}"))
            res["section_status"] = json.loads(res.get("section_status", "{}"))
            res["section_redirects"] = json.loads(res.get("section_redirects", "{}"))
            res["section_onpage"] = json.loads(res.get("section_onpage", "{}"))
            res["section_cannibalization"] = json.loads(res.get("section_cannibalization", "{}"))
            res["section_schema"] = json.loads(res.get("section_schema", "{}"))
            res["section_taxonomy"] = json.loads(res.get("section_taxonomy", "{}"))
            res["section_action_plans"] = json.loads(res.get("section_action_plans", "[]"))
            res["top_fixes"] = json.loads(res.get("top_fixes", "[]"))
            return res

    def save_redirect_rules(self, project_id: str, scan_id: str, rules: List[Dict[str, Any]]):
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            for r in rules:
                r_id = str(uuid.uuid4())
                conn.execute("""
                INSERT INTO redirect_rules (id, project_id, scan_id, rule_type, source_pattern, target_url, status_code, nginx_snippet, htaccess_snippet, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    r_id,
                    project_id,
                    scan_id,
                    r.get("rule_type", "chain_collapse"),
                    r.get("source_path") or r.get("source_url", ""),
                    r.get("target_url", ""),
                    r.get("status_code", 301),
                    r.get("nginx", ""),
                    r.get("htaccess", ""),
                    now,
                ))

    def log_email(self, project_id: str, recipient: str, subject: str, status: str, deltas_count: int = 0):
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO email_logs (id, project_id, recipient, subject, status, deltas_count, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), project_id, recipient, subject, status, deltas_count, now))
