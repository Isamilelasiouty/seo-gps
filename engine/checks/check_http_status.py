"""
HTTP Status Code Monitor Check for SEO GPS.
Author: Ismail El Asiouty

Classifies:
- False 404s (malformed URL with leading %20, \xa0, double slashes)
- Recoverable 404s (truncated Arabic/Latin slugs with high confidence)
- True dead pages (404/410 with inbound links and 301 redirect suggestion)
- Server errors (5xx)
- Redirect anomalies
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
        source = current_snapshot.get("source", "unknown")
        found_on = current_snapshot.get("found_on")
        prev_code = previous_snapshot.get("status_code", 200) if previous_snapshot else 200

        # 1. False 404 (malformed URL that resolves when cleaned)
        if current_snapshot.get("is_false_404"):
            defects = current_snapshot.get("url_defects", ["whitespace_padding"])
            sanitized = current_snapshot.get("sanitized_target", url)
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="critical",
                    category="status_404",
                    confidence="high",
                    url=url,
                    title="False 404 (Malformed URL defect)",
                    details=f"URL returned 404 due to formatting defect ({', '.join(defects)}). The clean URL returns valid content.",
                    evidence={
                        "raw_url": url,
                        "defects": defects,
                        "sanitized_target": sanitized,
                        "source": source,
                        "found_on": found_on,
                    },
                    suggestion={
                        "action": f"Fix broken link on {found_on or 'source page'} to use clean URL: {sanitized}",
                        "sanitized_target": sanitized,
                    },
                    before_state={"status_code": 404},
                    after_state={"sanitized_status": 200, "target": sanitized},
                )
            )
            return issues

        # 2. 404 / 410 Handling (True Dead or Recoverable Slug)
        if current_code in (404, 410):
            slug_rec = current_snapshot.get("slug_recovery")
            dead_match = current_snapshot.get("dead_page_match")
            inbound = current_snapshot.get("inbound_links", [])
            in_sitemap = current_snapshot.get("in_sitemap", False)

            if slug_rec and slug_rec.get("suggested_url"):
                conf = slug_rec.get("confidence", 0.7)
                suggested_url = slug_rec.get("suggested_url")
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="critical",
                        category="status_404",
                        confidence="high" if conf >= 0.8 else "medium",
                        url=url,
                        title=f"404 Not Found (Recoverable Slug match: {int(conf * 100)}% match)",
                        details=f"Page returns 404, but slug matches active page '{suggested_url}' with {int(conf * 100)}% confidence ({slug_rec.get('reason')}).",
                        evidence={
                            "status_code": current_code,
                            "slug": slug_rec.get("broken_slug"),
                            "matched_slug": slug_rec.get("matched_slug"),
                            "confidence": conf,
                            "source": source,
                            "found_on": found_on,
                            "inbound_links": inbound,
                            "in_sitemap": in_sitemap,
                        },
                        suggestion={
                            "action": f"Implement 301 redirect from this URL to {suggested_url}",
                            "target_url": suggested_url,
                        },
                        before_state={"status_code": current_code},
                        after_state={"target_url": suggested_url},
                    )
                )
            else:
                # True Dead Page
                details_msg = f"Page returns HTTP {current_code} and is linked internally from {len(inbound)} page(s)."
                if in_sitemap:
                    details_msg += " It is also present in sitemap.xml."

                suggested_target = dead_match.get("suggested_url") if dead_match else None
                title_msg = f"Page is now returning {current_code} (Broken link)" if prev_code == 200 else f"True Dead Page ({current_code} Not Found - Broken link)"
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="critical",
                        category="status_404",
                        confidence="high",
                        url=url,
                        title=title_msg,
                        details=details_msg,
                        evidence={
                            "status_code": current_code,
                            "inbound_links_count": len(inbound),
                            "inbound_links": inbound[:5],
                            "in_sitemap": in_sitemap,
                            "source": source,
                            "found_on": found_on,
                            "dead_page_match": dead_match,
                        },
                        suggestion={
                            "action": f"Remove broken links on source pages, or 301 redirect to {suggested_target or 'homepage'}",
                            "suggested_target": suggested_target,
                        },
                        before_state={"status_code": current_code},
                        after_state={"status_code": current_code},
                    )
                )
            return issues

        # 3. Server errors 5xx
        if current_code >= 500:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="critical",
                    category="server_error",
                    confidence="high",
                    url=url,
                    title=f"Server error HTTP {current_code}",
                    details=f"The server failed to respond normally, returning error code {current_code}.",
                    evidence={
                        "status_code": current_code,
                        "source": source,
                        "found_on": found_on,
                    },
                    suggestion={"action": "Investigate web server or application logs for 5xx root cause"},
                    before_state={"status_code": current_code},
                    after_state={"status_code": current_code},
                )
            )

        # 4. Slow response time (> 2500ms)
        if response_time > 2500 and current_code == 200:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    confidence="high",
                    url=url,
                    title=f"Extremely slow response time ({response_time}ms)",
                    details=f"Response time exceeded acceptable threshold of 2500ms (took {response_time}ms).",
                    evidence={"response_time_ms": response_time, "threshold_ms": 2500},
                    suggestion={"action": "Enable page caching, compress assets, or optimize server response"},
                )
            )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "description": "Monitors HTTP response codes, identifying false 404s, dead pages, 5xx server errors, and slug recovery candidates.",
        }
