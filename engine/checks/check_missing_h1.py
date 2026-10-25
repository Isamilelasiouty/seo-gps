"""
Missing H1 Tag Check (Sample Plugin Check).
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class MissingH1Check(BaseCheck):
    id = "missing_h1"
    title = "Primary Heading (H1) Tag Auditing"
    category = "metadata"
    default_severity = "notice"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        url = current_snapshot.get("url", "")
        status_code = current_snapshot.get("status_code", 200)

        if status_code != 200:
            return issues

        h1_tags = current_snapshot.get("h1_tags", []) or []

        if not h1_tags:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=url,
                    title="Missing H1 heading tag",
                    details="Page does not declare an <h1> heading tag, reducing semantic hierarchy clarity for crawlers.",
                    before_state={},
                    after_state={"h1_count": 0},
                )
            )
        elif len(h1_tags) > 1:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=url,
                    title=f"Multiple H1 tags ({len(h1_tags)}) found",
                    details=f"Page defines {len(h1_tags)} different <h1> tags. While valid in HTML5, one clear primary heading is recommended.",
                    before_state={},
                    after_state={"h1_count": len(h1_tags), "h1_tags": h1_tags[:3]},
                )
            )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Audits presence and uniqueness of the top-level <h1> heading on every indexable page.",
            "how_to_fix": "Add a descriptive <h1> tag reflecting the page's primary query target.",
        }
