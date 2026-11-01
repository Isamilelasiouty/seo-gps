"""
Thin Content Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class ThinContentCheck(BaseCheck):
    id = "check_thin_content"
    title = "Thin Content Warning"
    category = "onpage"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        if current_snapshot.get("status_code") != 200:
            return issues

        # Skip redirect or non-indexable pages
        if not current_snapshot.get("is_indexable", True):
            return issues

        word_count = current_snapshot.get("word_count", 0)
        threshold = current_snapshot.get("word_count_threshold", 250)
        url = current_snapshot.get("url", "")

        if 0 < word_count < threshold:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    confidence="high",
                    url=url,
                    title=f"Thin content ({word_count} words)",
                    details=f"Page has only {word_count} words of main content (minimum recommended is {threshold} words).",
                    evidence={"word_count": word_count, "threshold": threshold},
                    suggestion={"action": f"Expand page content with valuable details, FAQs, or structured tables to exceed {threshold} words"},
                    before_state={"word_count": previous_snapshot.get("word_count") if previous_snapshot else None},
                    after_state={"word_count": word_count},
                )
            )

        return issues
