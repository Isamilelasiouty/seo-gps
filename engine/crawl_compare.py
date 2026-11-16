"""
Crawl Compare & Regression Cause Analysis Engine.
Compares two audit snapshots (Scan A vs Scan B) to track what improved, what regressed, and the root causes.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Set, Tuple


class CrawlComparator:
    def __init__(self):
        pass

    def compare(
        self,
        baseline_pages: List[Dict[str, Any]],
        current_pages: List[Dict[str, Any]],
        baseline_score: int = 100,
        current_score: int = 100,
    ) -> Dict[str, Any]:
        """
        Performs exhaustive delta comparison between baseline scan and current scan.
        """
        base_map = {p.get("url"): p for p in baseline_pages if p.get("url")}
        curr_map = {p.get("url"): p for p in current_pages if p.get("url")}

        base_urls = set(base_map.keys())
        curr_urls = set(curr_map.keys())

        # 1. URL Additions / Removals
        added_urls = sorted(list(curr_urls - base_urls))
        removed_urls = sorted(list(base_urls - curr_urls))
        common_urls = base_urls.intersection(curr_urls)

        # 2. Status Code Transitions
        status_changes = []
        for url in common_urls:
            old_code = base_map[url].get("statusCode") or base_map[url].get("status_code", 200)
            new_code = curr_map[url].get("statusCode") or curr_map[url].get("status_code", 200)
            if old_code != new_code:
                status_changes.append({
                    "url": url,
                    "old_status": old_code,
                    "new_status": new_code,
                    "is_regression": (new_code >= 400 and old_code < 400),
                    "is_recovery": (old_code >= 400 and new_code < 400),
                })

        # 3. Directives & Canonical Drift
        directive_changes = []
        for url in common_urls:
            old_p = base_map[url]
            new_p = curr_map[url]
            old_robots = old_p.get("robots", "")
            new_robots = new_p.get("robots", "")
            old_canon = old_p.get("canonical", "")
            new_canon = new_p.get("canonical", "")

            # Noindex introduced
            if "noindex" in new_robots and "noindex" not in old_robots:
                directive_changes.append({
                    "url": url,
                    "type": "noindex_introduced",
                    "severity": "critical",
                    "description": "تمت إضافة وسم noindex لهذه الصفحة في الفحص الأخير، مما يهدد بفقدان أرشفتها.",
                })
            # Noindex removed
            elif "noindex" in old_robots and "noindex" not in new_robots:
                directive_changes.append({
                    "url": url,
                    "type": "noindex_removed",
                    "severity": "healthy",
                    "description": "تمت إزالة وسم noindex بنجاح وأصبحت الصفحة مؤهلة للظهور في نتائج البحث.",
                })

            if old_canon != new_canon and new_canon:
                directive_changes.append({
                    "url": url,
                    "type": "canonical_changed",
                    "severity": "notice",
                    "description": f"تغير رابط Canonical من '{old_canon}' إلى '{new_canon}'.",
                })

        # Score delta
        score_diff = current_score - baseline_score

        return {
            "summary": {
                "baseline_urls_count": len(base_urls),
                "current_urls_count": len(curr_urls),
                "added_urls_count": len(added_urls),
                "removed_urls_count": len(removed_urls),
                "status_changes_count": len(status_changes),
                "directive_changes_count": len(directive_changes),
                "score_diff": score_diff,
                "score_status": "improved" if score_diff > 0 else ("degraded" if score_diff < 0 else "stable"),
            },
            "added_urls": added_urls,
            "removed_urls": removed_urls,
            "status_changes": status_changes,
            "directive_changes": directive_changes,
        }
