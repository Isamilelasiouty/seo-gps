"""
Sitemap XML Synchronization Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class SitemapCheck(BaseCheck):
    id = "sitemap"
    title = "Sitemap XML Synchronization"
    category = "sitemap"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        url = current_snapshot.get("url", "")
        status_code = current_snapshot.get("status_code", 200)
        is_in_sitemap = current_snapshot.get("in_sitemap", False)
        is_indexable = current_snapshot.get("is_indexable", True)

        # 1. Non-200 or Noindex URL listed inside Sitemap
        if is_in_sitemap:
            if status_code in (404, 410, 500, 502, 503):
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="critical",
                        category=self.category,
                        url=url,
                        title=f"Broken page ({status_code}) included in Sitemap",
                        details=f"The sitemap contains URL returning HTTP {status_code}, wasting search engine crawl budget.",
                        before_state={},
                        after_state={"status_code": status_code, "in_sitemap": True},
                    )
                )
            elif not is_indexable:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="warning",
                        category=self.category,
                        url=url,
                        title="Non-indexable (noindex) page present in Sitemap",
                        details="The sitemap contains a URL marked as noindex or canonicalized away.",
                        before_state={},
                        after_state={"is_indexable": False, "in_sitemap": True},
                    )
                )

        # 2. Live indexable URL missing from Sitemap
        elif is_indexable and status_code == 200:
            # If context indicates sitemap was successfully crawled
            if context and context.get("sitemap_crawled"):
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="notice",
                        category=self.category,
                        url=url,
                        title="Indexable page not found in XML sitemap",
                        details="This healthy 200 OK page was discovered via internal links but is missing from sitemap.xml.",
                        before_state={},
                        after_state={"in_sitemap": False, "status_code": 200},
                    )
                )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Ensures XML sitemaps only include 200 OK indexable URLs and flags discovered pages omitted from sitemaps.",
            "how_to_fix": "Regenerate sitemap.xml to exclude broken/noindex URLs and include all high-value canonical pages.",
        }
