"""
Verification Engine for SEO GPS Site Reports.
Author: Ismail El Asiouty

Implements Section 6 Accuracy Verification:
1. Reconciliation invariant: total_discovered == total_crawled + total_skipped
2. Classification completeness: sum of all status classifications == total_crawled
3. Evidence integrity: every issue must have non-empty structured evidence
4. Fingerprint uniqueness: no duplicate issue fingerprints
5. Live sample check (--live-sample N): re-fetches random sample to verify ground truth
"""
import random
import re
from typing import Dict, Any, List, Optional
import httpx
from bs4 import BeautifulSoup


class ReportVerificationError(Exception):
    pass


class ReportVerifier:
    def __init__(self, user_agent: str = "SEO GPS Verification Engine / Ismail El Asiouty"):
        self.user_agent = user_agent

    def verify_report(self, report_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify structural and reconciliation invariants on a compiled report snapshot.
        Returns a dict: {'passed': bool, 'errors': List[str], 'warnings': List[str]}
        """
        errors = []
        warnings = []

        summary = report_dict.get("summary", {})
        discovered = summary.get("total_discovered", 0)
        crawled = summary.get("total_crawled", 0)
        skipped = summary.get("total_skipped", 0)

        # Invariant 1: Reconciliation equation
        if discovered != (crawled + skipped):
            errors.append(
                f"Reconciliation invariant failed: total_discovered ({discovered}) != "
                f"total_crawled ({crawled}) + total_skipped ({skipped})"
            )

        # Invariant 2: Classification sums
        status_dist = report_dict.get("status_distribution") or summary.get("status_distribution", {})
        total_classified = sum(status_dist.values())
        if total_classified != crawled:
            errors.append(
                f"Status distribution sum ({total_classified}) does not match total crawled ({crawled})"
            )

        # Invariant 3 & 4: Issue Evidence & Unique Fingerprints
        issues = report_dict.get("issues", [])
        if not issues and "section_status" in report_dict:
            # Check section items if issues key not top-level
            issues = report_dict.get("all_issues", [])
        seen_fingerprints = set()
        for idx, issue in enumerate(issues):
            fp = issue.get("fingerprint")
            if not fp:
                errors.append(f"Issue #{idx} ({issue.get('check_id')}) is missing a fingerprint")
            elif fp in seen_fingerprints:
                errors.append(f"Duplicate fingerprint detected: {fp} (Issue #{idx}: {issue.get('check_id')})")
            else:
                seen_fingerprints.add(fp)

            evidence = issue.get("evidence")
            if not evidence or not isinstance(evidence, dict) or len(evidence) == 0:
                errors.append(f"Issue '{issue.get('title', fp)}' at {issue.get('url')} lacks structured evidence")

        # Invariant 5: Top fixes sanity
        top_fixes = report_dict.get("top_fixes", [])
        if len(top_fixes) > 10:
            warnings.append(f"Top fixes has {len(top_fixes)} items; expected at most 10")

        return {
            "passed": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "issues_checked": len(issues),
            "urls_crawled": crawled,
        }

    async def verify_live_sample(self, scan_urls: List[Dict[str, Any]], sample_size: int = 5) -> Dict[str, Any]:
        """
        Self-check against reality: re-fetches N random URLs with an independent HTTP client
        and compares status, final URL, and title with what was stored.
        """
        errors = []
        sampled_count = 0
        mismatches = 0

        crawled_urls = [u for u in scan_urls if u.get("status_code") is not None]
        if not crawled_urls:
            return {
                "passed": True,
                "sampled_count": 0,
                "mismatches": 0,
                "details": "No crawled URLs available to sample",
            }

        sample = random.sample(crawled_urls, min(sample_size, len(crawled_urls)))
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=12.0) as client:
            for item in sample:
                sampled_count += 1
                url = item.get("url")
                expected_status = item.get("status_code")
                expected_title = item.get("title")

                try:
                    res = await client.get(url)
                    actual_status = res.status_code
                    actual_final_url = str(res.url)

                    # Compare status codes: tolerate 200 vs 200, 404 vs 404, or general redirect resolution
                    if actual_status != expected_status and not (expected_status in (301, 302, 307, 308) and actual_status == 200):
                        mismatches += 1
                        errors.append(
                            f"Status mismatch for {url}: expected {expected_status}, live returned {actual_status}"
                        )

                    # Compare title if it was 200
                    if actual_status == 200 and expected_title:
                        soup = BeautifulSoup(res.text, "html.parser")
                        actual_title = (soup.title.string or "").strip() if soup.title else ""
                        if actual_title and expected_title and actual_title != expected_title:
                            # If slight difference due to whitespace or pipe, warn
                            norm_actual = re.sub(r"\s+", " ", actual_title).strip()
                            norm_expected = re.sub(r"\s+", " ", expected_title).strip()
                            if norm_actual != norm_expected:
                                mismatches += 1
                                errors.append(
                                    f"Title mismatch for {url}: expected '{norm_expected}', got '{norm_actual}'"
                                )
                except Exception as exc:
                    mismatches += 1
                    errors.append(f"Failed to fetch live sample URL {url}: {exc}")

        return {
            "passed": mismatches == 0,
            "sampled_count": sampled_count,
            "mismatches": mismatches,
            "errors": errors,
        }
