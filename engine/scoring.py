"""
Semrush-Grade Site Health Scoring Model for SEO GPS.
Normalized by percentage of affected pages per issue type.
Large sites and small sites are evaluated fairly and proportionately.
Author: Ismail El Asiouty
"""
from typing import List, Dict, Any, Set
from engine.checks.base import Issue

SEVERITY_WEIGHTS = {
    "critical": 1.00,  # Errors
    "warning": 0.35,   # Warnings
    "notice": 0.08     # Notices
}

# Maximum allowed deduction ceiling to avoid negative health scores
MAX_PENALTY_CEILING = 3.5


def calculate_site_health_score(
    total_crawled_pages: int,
    issues: List[Any]
) -> Dict[str, Any]:
    """
    Computes a Semrush-grade proportional health score.
    Instead of subtracting fixed points per issue (which quickly reduces large sites to 0),
    deductions are weighted by the proportion of unique pages impacted by each check.
    """
    if total_crawled_pages <= 0:
        return {
            "health_score": 100,
            "errors_count": 0,
            "warnings_count": 0,
            "notices_count": 0,
            "penalty_ratio": 0.0,
            "total_crawled": 0
        }

    # Group affected unique URLs by check_id
    check_affected_urls: Dict[str, Set[str]] = {}
    check_severities: Dict[str, str] = {}

    crit_count = 0
    warn_count = 0
    notic_count = 0

    for iss in issues:
        # Support both Issue objects and dicts
        cid = getattr(iss, "check_id", None) or (iss.get("check_id") if isinstance(iss, dict) else "unknown")
        url = getattr(iss, "url", None) or (iss.get("url") if isinstance(iss, dict) else "")
        sev = getattr(iss, "severity", None) or (iss.get("severity") if isinstance(iss, dict) else "notice")

        if cid not in check_affected_urls:
            check_affected_urls[cid] = set()
            check_severities[cid] = sev

        if url:
            check_affected_urls[cid].add(url)

        if sev == "critical":
            crit_count += 1
        elif sev == "warning":
            warn_count += 1
        elif sev == "notice":
            notic_count += 1

    # Calculate weighted penalty ratio
    total_penalty = 0.0
    for cid, urls in check_affected_urls.items():
        affected_ratio = len(urls) / float(total_crawled_pages)
        sev = check_severities.get(cid, "notice")
        weight = SEVERITY_WEIGHTS.get(sev, 0.08)
        total_penalty += weight * affected_ratio

    # Normalize score between 0 and 100
    normalized_deduction = min(1.0, total_penalty / MAX_PENALTY_CEILING) * 100.0
    health_score = max(0, min(100, int(round(100.0 - normalized_deduction))))

    return {
        "health_score": health_score,
        "errors_count": crit_count,
        "warnings_count": warn_count,
        "notices_count": notic_count,
        "penalty_ratio": round(total_penalty, 4),
        "total_crawled": total_crawled_pages
    }
