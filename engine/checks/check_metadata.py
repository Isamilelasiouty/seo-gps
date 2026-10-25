"""
Metadata and Robots Tag Integrity Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class MetadataCheck(BaseCheck):
    id = "metadata"
    title = "Title, Description & Robots Directives"
    category = "metadata"
    default_severity = "warning"

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

        title = (current_snapshot.get("title") or "").strip()
        description = (current_snapshot.get("description") or "").strip()
        robots_meta = (current_snapshot.get("robots_meta") or "").lower()
        x_robots = (current_snapshot.get("x_robots_tag") or "").lower()

        prev_title = (previous_snapshot.get("title") or "").strip() if previous_snapshot else ""
        prev_desc = (previous_snapshot.get("description") or "").strip() if previous_snapshot else ""
        prev_robots = (previous_snapshot.get("robots_meta") or "").lower() if previous_snapshot else ""

        # 1. Critical: Accidental NOINDEX or NOFOLLOW addition
        is_noindex_now = "noindex" in robots_meta or "noindex" in x_robots
        was_noindex = "noindex" in prev_robots
        if is_noindex_now and not was_noindex:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="critical",
                    category=self.category,
                    url=url,
                    title="Accidental NOINDEX directive detected",
                    details="Page has been marked 'noindex' in meta robots or X-Robots-Tag, removing it from search index.",
                    before_state={"robots": prev_robots},
                    after_state={"robots": robots_meta or x_robots},
                )
            )

        # 2. Title Tag Auditing
        if not title:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="critical",
                    category=self.category,
                    url=url,
                    title="Missing or empty title tag",
                    details="Page has no <title> tag defined.",
                    before_state={"title": prev_title},
                    after_state={"title": ""},
                )
            )
        elif previous_snapshot and prev_title and title != prev_title:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title="Title tag changed",
                    details="The title tag text was modified compared to the previous snapshot.",
                    before_state={"title": prev_title},
                    after_state={"title": title},
                )
            )
        elif len(title) < 20:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=url,
                    title="Title tag too short (< 20 characters)",
                    details=f"Title is only {len(title)} characters long ('{title}').",
                    before_state={},
                    after_state={"title": title, "length": len(title)},
                )
            )
        elif len(title) > 70:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=url,
                    title="Title tag too long (> 70 characters)",
                    details=f"Title may be truncated in search results ({len(title)} characters).",
                    before_state={},
                    after_state={"title": title, "length": len(title)},
                )
            )

        # 3. Meta Description Auditing
        if not description:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title="Missing meta description",
                    details="Page has no meta description defined.",
                    before_state={"description": prev_desc},
                    after_state={"description": ""},
                )
            )
        elif previous_snapshot and prev_desc and description != prev_desc:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=url,
                    title="Meta description changed",
                    details="The meta description was modified compared to the previous snapshot.",
                    before_state={"description": prev_desc},
                    after_state={"description": description},
                )
            )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Monitors title tags, meta descriptions, and critical robots directives (noindex/nofollow).",
            "how_to_fix": "Restore or optimize title/description tags and immediately remove any unintended 'noindex' directives.",
        }
