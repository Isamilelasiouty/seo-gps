"""
Passive Subdomain & Staging Environment Exposure Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
import re
from urllib.parse import urlparse
from .base import BaseCheck, Issue

SENSITIVE_SUBDOMAIN_PREFIXES = (
    "dev.", "staging.", "stage.", "test.", "uat.", "beta.", "qa.", "old.", "demo.", "admin.", "internal."
)


class SubdomainExposureCheck(BaseCheck):
    id = "subdomains"
    title = "Staging & Dev Subdomain Exposure"
    category = "subdomains"
    default_severity = "critical"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        discovered_subdomains = (context or {}).get("discovered_subdomains", [])

        for sub in discovered_subdomains:
            sub_host = sub.get("hostname", "").lower()
            is_sensitive = any(sub_host.startswith(prefix) for prefix in SENSITIVE_SUBDOMAIN_PREFIXES)

            if is_sensitive:
                is_accessible = sub.get("is_accessible", False)
                has_noindex = sub.get("has_noindex", False)

                if is_accessible and not has_noindex:
                    issues.append(
                        Issue(
                            check_id=self.id,
                            severity="critical",
                            category=self.category,
                            url=f"https://{sub_host}",
                            title=f"Exposed staging environment ({sub_host}) without noindex/auth",
                            details=f"The subdomain '{sub_host}' is publicly reachable and lacks HTTP authentication or noindex headers, risking duplicate content penalties and data leaks.",
                            before_state={},
                            after_state={"subdomain": sub_host, "accessible": True, "noindex": False},
                        )
                    )
                elif is_accessible and has_noindex:
                    issues.append(
                        Issue(
                            check_id=self.id,
                            severity="notice",
                            category=self.category,
                            url=f"https://{sub_host}",
                            title=f"Discovered staging host ({sub_host}) with noindex",
                            details=f"Staging subdomain '{sub_host}' was discovered passively. It is protected with noindex.",
                            before_state={},
                            after_state={"subdomain": sub_host, "accessible": True, "noindex": True},
                        )
                    )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Passively identifies leaked dev, test, and staging environments from links and SSL transparency logs.",
            "how_to_fix": "Place non-production environments behind HTTP Basic Auth, VPNs, or IP allowlists, and enforce noindex.",
        }
