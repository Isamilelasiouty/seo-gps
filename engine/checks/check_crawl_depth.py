"""
Check for Excessive Crawl Depth (> 3 clicks from homepage).
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue


class CrawlDepthCheck(BaseCheck):
    id = "crawl_depth"
    title = "Crawl Depth Optimization"
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
        depth = current_snapshot.get("crawl_depth", 0)
        status_code = current_snapshot.get("status_code", 200)

        # We care about indexable 200 OK pages with high depth
        if status_code == 200 and depth >= 4:
            severity = "warning" if depth == 4 else "critical"
            issues.append(
                Issue(
                    check_id=self.id,
                    severity=severity,
                    category=self.category,
                    url=url,
                    title=f"عمق نقر مرتفع جداً (Crawl Depth: {depth})",
                    details=f"تتطلب هذه الصفحة {depth} نقرات من الصفحة الرئيسية للوصول إليها. الصفحات التي يزيد عمقها عن 3 نقرات تعاني من ضعف وصول عناكب البحث وفقدان قوة الروابط الداخلية (PageRank).",
                    evidence={
                        "url": url,
                        "crawl_depth": depth,
                        "status_code": status_code,
                    },
                    suggestion={
                        "action": "reduce_click_depth",
                        "recommendation": "قم بربط هذه الصفحة من مستويات أعلى كالقوائم الفرعية، أو روابط المقالات المميزة، لتقليل عمق الوصول إلى نقرتين أو 3 نقرات كحد أقصى.",
                    },
                )
            )

        return issues
