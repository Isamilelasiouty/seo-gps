"""
Pagination Directives and Canonicals Check.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
import re
from .base import BaseCheck, Issue


class PaginationCheck(BaseCheck):
    id = "pagination_audit"
    title = "Pagination Directives and Canonicals"
    category = "indexability"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues = []
        url = current_snapshot.get("url", "")
        canonical = current_snapshot.get("canonical_url") or current_snapshot.get("canonical", "")
        robots = str(current_snapshot.get("robots", "")).lower()

        # Check if URL represents pagination (e.g. /page/2, ?page=3, /p/4)
        is_paginated = bool(re.search(r"(/page/\d+|\?page=\d+|&page=\d+|/p/\d+)", url, re.I))

        if is_paginated:
            # 1. Critical defect: Paginated page canonicalizing to Page 1
            if canonical:
                is_canonical_to_root = not bool(re.search(r"(/page/\d+|\?page=\d+|&page=\d+|/p/\d+)", canonical, re.I))
                if is_canonical_to_root:
                    issues.append(
                        Issue(
                            check_id=self.id,
                            severity="critical",
                            category=self.category,
                            url=url,
                            title="صفحة ترقيم تشير لـ Canonical الصفحة الأولى",
                            details="تشير صفحة الترقيم (Pagination) هذه إلى الصفحة الأولى كـ Canonical. يؤدي هذا الخطأ إلى إيقاف جوجل عن فهرسة مقالات ومنتجات الصفحات الفرعية وتجاهلها.",
                            evidence={"url": url, "canonical": canonical},
                            suggestion={
                                "action": "set_self_canonical_pagination",
                                "recommendation": "اجعل وسم Canonical في كل صفحة ترقيم يشير إلى رابط الصفحة نفسها (Self-referencing Canonical) لضمان زحف وفهرسة محتوياتها.",
                            },
                        )
                    )

            # 2. Noindex on pagination series
            if "noindex" in robots:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="warning",
                        category=self.category,
                        url=url,
                        title="وسم noindex على صفحة ترقيم (Noindex on Pagination)",
                        details="الصفحة المرقمة تحتوي على وسم noindex. على الرغم من أنه يمنع ظهور الصفحة، إلا أن جوجل يتوقف مع الوقت عن تتبع الروابط الموجودة بداخلها (PageRank leakage).",
                        evidence={"url": url, "robots": robots},
                        suggestion={
                            "action": "remove_noindex_pagination",
                            "recommendation": "أزل وسم noindex واعتمد على وسم Canonical ذاتي ومحتوى فريد وروابط واضحة.",
                        },
                    )
                )

        return issues
