"""
Main Entrypoint for Hourly Dispatcher and Crawler Runner.
Author: Ismail El Asiouty
"""
import asyncio
import os
import sys
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load local environment if present
load_dotenv()

from engine.crawler import PoliteCrawler
from engine.diff import DiffEngine
from engine.mail.mailer import Mailer


async def run_audit_for_project(project: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a complete audit run for a single project.
    """
    project_id = project.get("id")
    domain = project.get("domain")
    root_url = project.get("root_url")
    sitemap_url = project.get("sitemap_url")

    print(f"[SEO GPS] Starting audit for project: {domain} ({root_url})")

    # 1. Crawl
    crawler = PoliteCrawler(
        domain=domain,
        max_pages=int(os.getenv("CRAWL_MAX_PAGES_PER_PROJECT", 2000)),
        concurrency=int(os.getenv("CRAWL_CONCURRENCY", 5)),
        delay_ms=int(os.getenv("CRAWL_POLITE_DELAY_MS", 250)),
        timeout=int(os.getenv("CRAWL_TIMEOUT_SECONDS", 25)),
    )
    current_snapshots = await crawler.crawl(root_url, sitemap_url)
    print(f"[SEO GPS] Crawled {len(current_snapshots)} pages for {domain}")

    # 2. In a live environment with Supabase, fetch previous snapshots:
    # Here we default to empty previous snapshots if it's the first run
    previous_snapshots: List[Dict[str, Any]] = []

    # 3. Diff Engine & Check execution
    diff_engine = DiffEngine()
    is_first_run = len(previous_snapshots) == 0
    issues, resolved, health_score = diff_engine.compare_snapshots(
        current_snapshots=current_snapshots,
        previous_snapshots=previous_snapshots,
        is_first_run=is_first_run,
    )

    crit_issues = [i for i in issues if i.severity == "critical"]
    warn_issues = [i for i in issues if i.severity == "warning"]
    notice_issues = [i for i in issues if i.severity == "notice"]

    print(f"[SEO GPS] Run complete. Health Score: {health_score}/100. Issues: Critical: {len(crit_issues)}, Warning: {len(warn_issues)}, Notice: {len(notice_issues)}")

    # 4. Dispatch Email Report
    recipients = project.get("recipients", [])
    if recipients:
        mailer = Mailer()
        await mailer.send_report(
            recipients=recipients,
            domain=domain,
            run_date=datetime.now().strftime("%d %b %Y"),
            health_score=health_score,
            critical_issues=crit_issues,
            warning_issues=warn_issues,
            notice_issues=notice_issues,
            resolved_issues=resolved,
        )

    return {
        "project_id": project_id,
        "domain": domain,
        "pages_crawled": len(current_snapshots),
        "health_score": health_score,
        "issues_count": len(issues),
        "critical_count": len(crit_issues),
        "warning_count": len(warn_issues),
        "notice_count": len(notice_issues),
    }


if __name__ == "__main__":
    test_project = {
        "id": "test-uuid",
        "domain": "example.com",
        "root_url": "https://example.com",
        "sitemap_url": None,
        "recipients": [],
    }
    asyncio.run(run_audit_for_project(test_project))
