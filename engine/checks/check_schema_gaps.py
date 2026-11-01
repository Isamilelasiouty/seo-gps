"""
Structured Data Gaps & FAQ Generator Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue
from engine.content_analyzers import extract_real_faq_items, generate_faq_json_ld


class SchemaGapsCheck(BaseCheck):
    id = "check_schema_gaps"
    title = "Structured Data Gaps"
    category = "schema"
    default_severity = "notice"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        if current_snapshot.get("status_code") != 200:
            return issues

        url = current_snapshot.get("url", "")
        raw_html = current_snapshot.get("raw_html", "")
        schema_types = current_snapshot.get("schema_types", [])

        # Check for real FAQ content present without FAQPage schema
        if raw_html and "FAQPage" not in schema_types:
            qa_pairs = extract_real_faq_items(raw_html)
            if len(qa_pairs) >= 2:
                jsonld = generate_faq_json_ld(qa_pairs)
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="notice",
                        category=self.category,
                        confidence="high",
                        url=url,
                        title=f"Schema gap: {len(qa_pairs)} FAQ questions detected without FAQPage schema",
                        details=f"The page has {len(qa_pairs)} question-and-answer pairs in its content but lacks FAQPage JSON-LD schema.",
                        evidence={
                            "faq_count": len(qa_pairs),
                            "sample_questions": [p["question"] for p in qa_pairs[:3]],
                        },
                        suggestion={
                            "action": "Add FAQPage structured data to page header",
                            "generated_jsonld": jsonld,
                        },
                    )
                )

        return issues
