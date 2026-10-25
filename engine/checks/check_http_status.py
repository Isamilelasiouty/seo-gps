"""
HTTP Status Code Monitor Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class HttpStatusCheck(BaseCheck):
    id = "http_status"
    title = "HTTP Status Code Monitor"
    category = "status"
    default_severity = "critical"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        url = current_snapshot.get("url", "")
        current_code = current_snapshot.get("status_code", 0)
        response_time = current_snapshot.get("response_time_ms", 0)

        # Baseline: previous status
        prev_code = previous_snapshot.get("status_code", 200) if previous_snapshot else 200

        # 1. Critical: 200 -> 404, 410, or 5xx server errors
        if current_code in (404, 410) and prev_code == 200:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="critical",
                    category=self.category,
                    url=url,
                    title=f"Page is now returning {current_code} (Broken link)",
                    details=f"The URL previously returned HTTP {prev_code} but now responds with {current_code}.",
                    before_state={"status_code": prev_code},
                    after_state={"status_code": current_code},
                )
            )
        elif current_code >= 500:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="critical",
                    category=self.category,
                    url=url,
                    title=f"Server error HTTP {current_code}",
                    details=f"The server failed to respond normally, returning error code {current_code}.",
                    before_state={"status_code": prev_code},
                    after_state={"status_code": current_code},
                )
            )

        # 2. Redirects: 301, 302, 307, 308 newly introduced
        elif current_code in (301, 302, 307, 308) and prev_code == 200:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title=f"New redirect detected ({current_code})",
                    details=f"This URL used to load directly with 200 OK, but is now redirecting ({current_code}).",
                    before_state={"status_code": prev_code},
                    after_state={"status_code": current_code, "redirect_to": current_snapshot.get("redirect_to")},
                )
            )

        # 3. Slow response time (> 2500ms)
        if response_time > 2500 and current_code == 200:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title=f"Extremely slow response time ({response_time}ms)",
                    details=f"Response time exceeded acceptable threshold of 2500ms (took {response_time}ms).",
                    before_state={"response_time_ms": previous_snapshot.get("response_time_ms", 0) if previous_snapshot else 0},
                    after_state={"response_time_ms": response_time},
                )
            )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Tracks HTTP status transitions, server outages (5xx), broken pages (404/410), and new redirect hops.",
            "how_to_fix": "Fix broken server handlers, verify URL rewrite configurations, or restore mistakenly deleted pages.",
        }
