"""
Soft 404 Detection Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class Soft404Check(BaseCheck):
    id = "check_soft_404"
    title = "Soft 404 Error"
    category = "status_404"
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

        if current_snapshot.get("is_soft_404"):
            url = current_snapshot.get("url", "")
            evidence = current_snapshot.get("soft_404_evidence") or {"reason": "Matches soft 404 error template"}
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    confidence="medium",  # Always labelled lower confidence per specification
                    url=url,
                    title="Soft 404 Detected (Returns 200 but looks like error page)",
                    details="Page returns HTTP 200 OK but displays 'Page Not Found' phrases or empty error templates.",
                    evidence=evidence,
                    suggestion={"action": "Return HTTP 404 / 410 or 301 redirect to relevant active content"},
                )
            )

        return issues
