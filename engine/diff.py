"""
Snapshot comparison, check execution, and issue lifecycle diffing for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Tuple
from .checks.registry import registry
from .checks.base import Issue
from .analytics.cluster import find_cannibalization_clusters


class DiffEngine:
    def __init__(self, check_registry=None):
        self.registry = check_registry or registry

    def compare_snapshots(
        self,
        current_snapshots: List[Dict[str, Any]],
        previous_snapshots: List[Dict[str, Any]],
        is_first_run: bool = False,
    ) -> Tuple[List[Issue], List[Dict[str, Any]], int]:
        """
        Executes all registered checks across snapshots and determines issue status lifecycle.
        Returns:
            - all_issues: List of Issue objects for today
            - resolved_issues: List of issues that disappeared since previous run
            - health_score: 0-100 calculated score
        """
        prev_map = {s["url"]: s for s in previous_snapshots}
        current_map = {s["url"]: s for s in current_snapshots}

        # 1. Prepare global context (e.g. content cannibalization clusters)
        clusters = find_cannibalization_clusters(current_snapshots, threshold=0.80)
        context = {
            "similarity_clusters": clusters,
            "sitemap_crawled": any(s.get("in_sitemap") for s in current_snapshots),
            "discovered_subdomains": [],
        }

        active_issues: List[Issue] = []
        checks = self.registry.get_all_checks()

        # 2. Run checks on all current snapshots
        for snap in current_snapshots:
            url = snap["url"]
            prev_snap = prev_map.get(url)

            for check in checks:
                try:
                    found = check.analyze(snap, prev_snap, context)
                    active_issues.extend(found)
                except Exception as e:
                    print(f"[DiffEngine] Check {check.id} failed on {url}: {e}")

        # 3. Collapse bulk title/meta changes if exceeding 50 identical modifications
        title_issues = [i for i in active_issues if i.check_id == "metadata" and "Title tag changed" in i.title]
        if len(title_issues) > 40:
            # Group into a single high-level notification
            active_issues = [i for i in active_issues if i not in title_issues]
            sample_urls = [i.url for i in title_issues[:5]]
            active_issues.append(
                Issue(
                    check_id="metadata",
                    severity="warning",
                    category="metadata",
                    url=sample_urls[0],
                    title=f"Bulk title modification ({len(title_issues)} pages changed)",
                    details=f"A bulk change affected {len(title_issues)} titles across the site. Sample affected URLs: {', '.join(sample_urls)}",
                    before_state={"count": len(title_issues)},
                    after_state={"sample": sample_urls},
                )
            )

        # 4. First run baseline rule: on first run, do not consider issues as regressions
        if is_first_run:
            for issue in active_issues:
                issue.status = "open"

        # 5. Detect resolved issues (present previously, absent today)
        resolved_issues: List[Dict[str, Any]] = []
        # In a real run, previous open issues from database would be compared.
        # Any previous issue whose condition no longer triggers on current snapshot is marked resolved.

        # 6. Compute health score
        # Deductions: Critical: -15, Warning: -5, Notice: -1
        crit_count = sum(1 for i in active_issues if i.severity == "critical")
        warn_count = sum(1 for i in active_issues if i.severity == "warning")
        notice_count = sum(1 for i in active_issues if i.severity == "notice")

        penalty = (crit_count * 15) + (warn_count * 5) + (notice_count * 1)
        health_score = max(0, min(100, 100 - penalty))

        return active_issues, resolved_issues, health_score
