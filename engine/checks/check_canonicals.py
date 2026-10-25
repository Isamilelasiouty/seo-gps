"""
Canonical Tag Integrity Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
from .base import BaseCheck, Issue


class CanonicalCheck(BaseCheck):
    id = "canonicals"
    title = "Canonical Tag Integrity"
    category = "canonical"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        url = current_snapshot.get("url", "")
        current_canonical = current_snapshot.get("canonical_url")
        status_code = current_snapshot.get("status_code", 200)

        if status_code != 200:
            return issues

        # 1. Missing canonical tag
        if not current_canonical:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title="Missing canonical tag",
                    details="Page does not declare a canonical link rel tag.",
                    before_state={"canonical_url": previous_snapshot.get("canonical_url") if previous_snapshot else None},
                    after_state={"canonical_url": None},
                )
            )
            return issues

        # 2. Canonical target changed since previous snapshot
        if previous_snapshot and previous_snapshot.get("canonical_url"):
            prev_canonical = previous_snapshot.get("canonical_url")
            if current_canonical != prev_canonical:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="critical",
                        category=self.category,
                        url=url,
                        title="Canonical target URL changed",
                        details=f"Canonical changed from '{prev_canonical}' to '{current_canonical}'.",
                        before_state={"canonical_url": prev_canonical},
                        after_state={"canonical_url": current_canonical},
                    )
                )

        # 3. Off-domain canonical check
        try:
            url_domain = urlparse(url).netloc
            canonical_domain = urlparse(current_canonical).netloc
            if canonical_domain and url_domain != canonical_domain:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="warning",
                        category=self.category,
                        url=url,
                        title="Canonical points to external domain",
                        details=f"Canonical points to third-party domain: {canonical_domain}.",
                        before_state={},
                        after_state={"canonical_url": current_canonical, "external_domain": canonical_domain},
                    )
                )
        except Exception:
            pass

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Audits canonical tag existence, cross-domain canonicals, and unexpected modifications.",
            "how_to_fix": "Ensure each indexable URL self-canonicals or explicitly points to its authoritative version.",
        }
