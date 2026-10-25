"""
Content Cannibalization & Similarity Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class SimilarityCheck(BaseCheck):
    id = "similarity"
    title = "Keyword & Content Cannibalization"
    category = "similarity"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        url = current_snapshot.get("url", "")
        clusters = (context or {}).get("similarity_clusters", [])

        for cluster in clusters:
            if cluster.get("url_a") == url or cluster.get("url_b") == url:
                partner_url = cluster.get("url_b") if cluster.get("url_a") == url else cluster.get("url_a")
                partner_title = cluster.get("title_b") if cluster.get("url_a") == url else cluster.get("title_a")
                sim = cluster.get("similarity", 0.0)

                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="warning",
                        category=self.category,
                        url=url,
                        title=f"Potential keyword cannibalization ({int(sim * 100)}% match)",
                        details=f"This page has strong topic and keyword overlap ({int(sim * 100)}%) with: {partner_url} ('{partner_title}'). Competing pages may split ranking authority.",
                        before_state={},
                        after_state={
                            "competing_url": partner_url,
                            "competing_title": partner_title,
                            "similarity_score": sim,
                        },
                    )
                )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Discovers internal pages that compete for the same queries, titles, and semantic topics.",
            "how_to_fix": "Differentiate page search intents, consolidate thin competing pages with 301 redirects, or adjust canonical tags.",
        }
