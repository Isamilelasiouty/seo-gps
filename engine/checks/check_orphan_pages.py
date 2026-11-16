"""
Check for Orphan Pages (pages in sitemap with zero internal inlinks).
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class OrphanPagesCheck(BaseCheck):
    id = "orphan_pages"
    title = "Orphan Pages Detection"
    category = "structure"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues = []
        url = current_snapshot.get("url", "")
        source = current_snapshot.get("source", "")
        inlinks = current_snapshot.get("inlinks", [])
        status_code = current_snapshot.get("status_code", 200)

        # Ignore root/homepage
        parsed_path = current_snapshot.get("path", "")
        if parsed_path in ("", "/"):
            return issues

        # An orphan page is present in sitemap or inventory, but has 0 internal inlinks
        if status_code == 200 and source in ("sitemap", "imported") and len(inlinks) == 0:
            inlink_count = context.get("inlink_counts", {}).get(url, 0) if context else 0
            if inlink_count == 0:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity=self.default_severity,
                        category=self.category,
                        url=url,
                        title="صفحة يتيمة بدون روابط داخلية (Orphan Page)",
                        details="الصفحة موجودة في خريطة الموقع (Sitemap) ولكن لا توجد أي روابط داخلية تشير إليها من صفحات الموقع الأخرى، مما يصعب على محركات البحث والمستخدمين الوصول إليها.",
                        evidence={
                            "url": url,
                            "source": source,
                            "inlinks_count": 0,
                            "status_code": status_code,
                        },
                        suggestion={
                            "action": "add_internal_links",
                            "recommendation": "أضف روابط سياقية طبيعية من المقالات أو الأقسام ذات الصلة تشير إلى هذه الصفحة، أو أضفها إلى القائمة الرئيسية أو التذييل.",
                        },
                    )
                )

        return issues
