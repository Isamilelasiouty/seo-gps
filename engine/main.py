"""
Main Audit Orchestrator for SEO GPS.
Author: Ismail El Asiouty

Coordinates:
- PoliteCrawler with sitemap, root, BFS links, and imported URLs
- Check execution via DiffEngine
- Deterministic IssueLifecycleManager (new, persisting, resolved, reappeared)
- SiteReportCompiler with 7 anchored sections & top 10 fixes
- Persistence via LocalStorage (SQLite)
- Email dispatch via Mailer (first scan baseline vs daily alert)
- Automated verification via ReportVerifier
"""
import asyncio
import os
import sys
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

from engine.crawler import PoliteCrawler
from engine.diff import DiffEngine
from engine.lifecycle import IssueLifecycleManager
from engine.report import SiteReportCompiler
from engine.storage import LocalStorage
from engine.mail.mailer import Mailer
from engine.verify import ReportVerifier


async def run_audit_for_project(
    project: Dict[str, Any],
    scan_type: str = "auto",
    imported_urls: Optional[List[str]] = None,
    storage: Optional[LocalStorage] = None,
    local_mode: Optional[bool] = None,
    target_year: int = 2027,
    progress_callback: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Executes a complete baseline or daily audit run for a project.
    """
    if local_mode is None:
        has_resend = bool(os.getenv("RESEND_API_KEY")) and not os.getenv("RESEND_API_KEY", "").startswith("re_12345")
        local_mode = not has_resend

    storage = storage or LocalStorage()
    project_id = project.get("id") or "local_project"
    domain = project.get("domain") or "unknown.com"
    root_url = project.get("root_url") or f"http://{domain}"
    sitemap_url = project.get("sitemap_url")
    imported_urls = imported_urls or project.get("imported_urls", [])
    recipients = project.get("recipients", [])
    if isinstance(recipients, str):
        recipients = [r.strip() for r in recipients.split(",") if r.strip()]

    # Ensure project exists in storage
    existing_proj = storage.get_project(project_id)
    if not existing_proj:
        storage.save_project({
            "id": project_id,
            "name": project.get("name", domain),
            "domain": domain,
            "root_url": root_url,
            "sitemap_url": sitemap_url,
            "settings": {"recipient_emails": recipients, "target_year": target_year},
        })

    # Determine if baseline or daily
    previous_baseline = storage.get_latest_scan(project_id, scan_type="baseline")
    if scan_type == "auto":
        is_baseline = previous_baseline is None
        scan_type_str = "baseline" if is_baseline else "daily"
    else:
        is_baseline = (scan_type == "baseline")
        scan_type_str = scan_type

    print(f"\n=======================================================")
    print(f"[SEO GPS] Running {scan_type_str.upper()} Audit for: {domain}")
    print(f"[SEO GPS] Target URL: {root_url}")
    print(f"=======================================================")

    # 1. Create Scan Record in Storage
    scan_id = storage.create_scan(
        project_id=project_id,
        scan_type=scan_type_str,
    )

    # 2. Execute Crawler
    is_local_host = "127.0.0.1" in root_url or "localhost" in root_url or local_mode
    crawler = PoliteCrawler(
        domain=domain,
        max_pages=int(project.get("max_pages", os.getenv("CRAWL_MAX_PAGES_PER_PROJECT", 2000))),
        concurrency=int(project.get("concurrency", os.getenv("CRAWL_CONCURRENCY", 5))),
        delay_ms=int(project.get("delay_ms", os.getenv("CRAWL_POLITE_DELAY_MS", 200))),
        timeout=int(project.get("timeout", os.getenv("CRAWL_TIMEOUT_SECONDS", 25))),
        allow_local=is_local_host,
        target_year=target_year,
    )

    storage.update_scan(scan_id, phase="crawling")
    if progress_callback:
        progress_callback({"phase": "crawling", "discovered": 0, "crawled": 0})

    crawl_result = await crawler.crawl(
        root_url=root_url,
        sitemap_url=sitemap_url,
        extra_urls=imported_urls,
    )
    current_snapshots = crawl_result.get("crawled_pages", [])
    crawl_stats = crawler.get_crawl_stats()
    print(f"[SEO GPS] Crawl finished. Discovered: {crawl_stats['total_discovered']}, Crawled: {crawl_stats['total_crawled']}, Skipped: {crawl_stats['total_skipped']}")

    storage.update_scan(
        scan_id,
        phase="analyzing",
        total_discovered=crawl_stats["total_discovered"],
        total_crawled=crawl_stats["total_crawled"],
        total_skipped=crawl_stats["total_skipped"],
    )

    # 3. Store Scan URLs
    storage.save_scan_urls(scan_id, project_id, current_snapshots)

    # 4. Run Checks & Diff Engine
    diff_engine = DiffEngine()
    raw_issues, _, health_score = diff_engine.compare_snapshots(
        current_snapshots=current_snapshots,
        previous_snapshots=[],
        is_first_run=is_baseline,
    )

    # 5. Issue Lifecycle Reconciliation
    stored_issues = storage.get_issues(project_id)
    now_dt = datetime.now(timezone.utc)
    reconciled_issues, issue_events, counters = IssueLifecycleManager.reconcile(
        project_id=project_id,
        scan_id=scan_id,
        is_baseline=is_baseline,
        current_issues=raw_issues,
        stored_issues=stored_issues,
        scan_time=now_dt,
    )

    # Save reconciled issues & events
    storage.save_issues(project_id, reconciled_issues, is_baseline=is_baseline)
    if issue_events:
        storage.save_issue_events(issue_events)

    active_issues = [i for i in reconciled_issues if i.get("status") in ("new", "persisting", "reappeared")]
    new_issues = [i for i in reconciled_issues if i.get("status") == "new"]
    persisting_issues = [i for i in reconciled_issues if i.get("status") == "persisting"]
    resolved_issues = [i for i in reconciled_issues if i.get("status") == "resolved" and i.get("resolved_scan_id") == scan_id]
    reappeared_issues = [i for i in reconciled_issues if i.get("status") == "reappeared"]

    # 6. Compile Comprehensive Site Report
    report_dict = SiteReportCompiler.compile_report(
        scan_id=scan_id,
        project_id=project_id,
        domain=domain,
        root_url=root_url,
        crawled_pages=current_snapshots,
        skipped_urls=crawl_result.get("skipped_urls", []),
        redirect_inventory=crawl_result.get("redirect_inventory", []),
        redirect_rules=crawl_result.get("redirect_rules", []),
        issues=active_issues,
        target_year=target_year,
    )
    report_dict["issues"] = active_issues
    health_score = report_dict["summary"]["health_score"]

    # Save report snapshot and redirect rules
    storage.save_report_snapshot({
        "project_id": project_id,
        "scan_id": scan_id,
        **report_dict,
    })
    
    redirect_rules = report_dict.get("redirect_rules", [])
    if redirect_rules:
        storage.save_redirect_rules(project_id, scan_id, redirect_rules)

    # 7. Verify Accuracy Invariants
    verifier = ReportVerifier()
    v_result = verifier.verify_report(report_dict)
    if not v_result["passed"]:
        print(f"[SEO GPS] [WARNING] Report verification detected discrepancies: {v_result['errors']}")
    else:
        print(f"[SEO GPS] [VERIFY] All reconciliation invariants verified successfully!")

    # 8. Mark Scan Finished
    summary_counts = {
        "discovered": crawl_stats["total_discovered"],
        "crawled": crawl_stats["total_crawled"],
        "skipped": crawl_stats["total_skipped"],
        "health_score": health_score,
        "new_issues": len(new_issues),
        "persisting_issues": len(persisting_issues),
        "resolved_issues": len(resolved_issues),
        "reappeared_issues": len(reappeared_issues),
    }
    storage.update_scan(
        scan_id,
        status="completed",
        phase="completed",
        finished_at=now_dt.isoformat(),
        health_score=health_score,
        counters=summary_counts,
    )

    # 9. Email Dispatch
    if recipients:
        mailer = Mailer(local_mode=local_mode)
        run_date_str = now_dt.strftime("%d %b %Y")
        
        frontend_url = os.getenv("FRONTEND_URL", "https://isamilelasiouty.github.io/seo-gps").rstrip("/")
        if is_baseline:
            await mailer.send_first_scan_report(
                recipients=recipients,
                domain=domain,
                run_date=run_date_str,
                health_score=health_score,
                summary=crawl_stats,
                status_distribution=report_dict.get("status_distribution", {}),
                category_counts=report_dict.get("category_counts", {}),
                severity_counts=report_dict.get("severity_counts", {}),
                top_fixes=report_dict.get("top_fixes", []),
                report_url=f"{frontend_url}/#/site-report",
                dashboard_url=f"{frontend_url}/#/",
            )
        else:
            baseline_count = sum(1 for i in persisting_issues if i.get("is_baseline"))
            await mailer.send_daily_alert(
                recipients=recipients,
                domain=domain,
                run_date=run_date_str,
                health_score=health_score,
                summary={
                    "new_count": len(new_issues),
                    "persisting_count": len(persisting_issues),
                    "baseline_count": baseline_count,
                    "resolved_count": len(resolved_issues),
                    "reappeared_count": len(reappeared_issues),
                },
                new_issues=new_issues,
                persisting_issues=persisting_issues,
                resolved_issues=resolved_issues,
                reappeared_issues=reappeared_issues,
                email_policy=project.get("email_policy", "send_every_run"),
                dashboard_url=f"{frontend_url}/#/",
            )

    # Update Supabase projects record with last_run_at and health_score
    supa_url = os.getenv("SUPABASE_URL")
    supa_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supa_url and supa_key and project_id and project_id != "local_project":
        try:
            headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}", "Content-Type": "application/json"}
            update_payload = {
                "last_run_at": now_dt.isoformat(),
                "health_score": health_score,
                "status": "active",
            }
            async with httpx.AsyncClient(timeout=10) as c:
                res = await c.patch(f"{supa_url}/rest/v1/projects?id=eq.{project_id}", headers=headers, json=update_payload)
                if res.status_code in (200, 204):
                    print(f"[SEO GPS] Successfully updated Supabase project {project_id} last_run_at to {now_dt.isoformat()}")
        except Exception as e:
            print(f"[SEO GPS] Note: Could not sync last_run_at to Supabase: {e}")

    print(f"[SEO GPS] Audit run finished for {domain}. Scan ID: {scan_id}")
    return {
        "scan_id": scan_id,
        "domain": domain,
        "is_baseline": is_baseline,
        "health_score": health_score,
        "stats": crawl_stats,
        "reconciliation": {
            "active_issues": active_issues,
            "new_issues": new_issues,
            "persisting_issues": persisting_issues,
            "resolved_issues": resolved_issues,
            "reappeared_issues": reappeared_issues,
            "counters": counters,
        },
        "verification": v_result,
        "report": report_dict,
    }


if __name__ == "__main__":
    import json
    project_env = os.environ.get("PROJECT_DATA")
    if project_env:
        try:
            project_data = json.loads(project_env)
        except Exception as e:
            print(f"[SEO GPS] Error parsing PROJECT_DATA: {e}")
            sys.exit(1)
    elif len(sys.argv) > 1:
        target = sys.argv[1]
        domain = target.replace("https://", "").replace("http://", "").split("/")[0]
        recipients = [sys.argv[2]] if len(sys.argv) > 2 else []
        project_data = {
            "id": f"proj_{domain.replace('.', '_')}",
            "name": domain,
            "domain": domain,
            "root_url": target,
            "recipients": recipients,
        }
    else:
        print("[SEO GPS] No PROJECT_DATA environment variable or CLI arguments provided.")
        sys.exit(0)

    has_resend = bool(os.getenv("RESEND_API_KEY")) and not os.getenv("RESEND_API_KEY", "").startswith("re_12345")
    local_mode = not has_resend

    asyncio.run(run_audit_for_project(
        project=project_data,
        scan_type="auto",
        local_mode=local_mode,
    ))

