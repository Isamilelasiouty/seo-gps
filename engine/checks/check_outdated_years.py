"""
Year Pattern Scanner Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue
from engine.content_analyzers import scan_outdated_years


class OutdatedYearCheck(BaseCheck):
    id = "check_outdated_years"
    title = "Outdated Year References"
    category = "freshness"
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

        target_year = current_snapshot.get("target_year", 2027)
        url = current_snapshot.get("url", "")

        fields_to_scan = [
            ("title", current_snapshot.get("title", "")),
            ("h1", current_snapshot.get("h1", "")),
            ("description", current_snapshot.get("description", "")),
        ]

        found_years = []
        for field_name, text in fields_to_scan:
            if text:
                matches = scan_outdated_years(text, target_year=target_year, field_name=field_name)
                found_years.extend(matches)

        if found_years:
            first = found_years[0]
            detected = first["detected_year"]
            field = first["field"]
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    confidence="high",
                    url=url,
                    title=f"Outdated year {detected} found in {field}",
                    details=f"The page references past year {detected} in its {field}. Recommend updating to {target_year}.",
                    evidence={
                        "field": field,
                        "detected_year": detected,
                        "target_year": target_year,
                        "original_snippet": first["original_snippet"],
                    },
                    suggestion={
                        "action": f"Update year from {detected} to {target_year}",
                        "suggested_text": first["suggested_text"],
                    },
                    before_state={"year": detected},
                    after_state={"target_year": target_year},
                )
            )

        return issues
