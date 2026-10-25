"""
Structured Data (Schema.org) Integrity Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue

REQUIRED_SCHEMA_FIELDS = {
    "Article": ["headline", "author", "datePublished"],
    "Product": ["name", "offers"],
    "Organization": ["name", "url"],
    "BreadcrumbList": ["itemListElement"],
    "FAQPage": ["mainEntity"],
    "LocalBusiness": ["name", "address"],
}


class SchemaCheck(BaseCheck):
    id = "schema"
    title = "Structured Data & Schema Integrity"
    category = "schema"
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

        current_schemas = current_snapshot.get("schema_types", []) or []
        prev_schemas = (previous_snapshot.get("schema_types", []) or []) if previous_snapshot else []

        # 1. Removed Schema Type compared to yesterday
        for schema_type in prev_schemas:
            if schema_type not in current_schemas:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="critical",
                        category=self.category,
                        url=url,
                        title=f"Schema type '{schema_type}' was removed",
                        details=f"Page previously included structured data for '{schema_type}', but it is missing today.",
                        before_state={"schema_types": prev_schemas},
                        after_state={"schema_types": current_schemas},
                    )
                )

        # 2. Schema syntax or parsing errors
        schema_errors = current_snapshot.get("schema_errors", [])
        if schema_errors:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title="Structured data syntax error",
                    details=f"JSON-LD or Microdata syntax error detected: {', '.join(schema_errors[:2])}",
                    before_state={},
                    after_state={"errors": schema_errors},
                )
            )

        # 3. Missing required fields in discovered schemas
        parsed_items = current_snapshot.get("schema_items", {}) or {}
        for stype, req_fields in REQUIRED_SCHEMA_FIELDS.items():
            if stype in current_schemas:
                fields_present = parsed_items.get(stype, {})
                missing = [f for f in req_fields if f not in fields_present]
                if missing:
                    issues.append(
                        Issue(
                            check_id=self.id,
                            severity="warning",
                            category=self.category,
                            url=url,
                            title=f"Incomplete {stype} Schema (Missing: {', '.join(missing)})",
                            details=f"Required properties for Google Rich Results are missing: {', '.join(missing)}.",
                            before_state={},
                            after_state={"schema_type": stype, "missing_fields": missing},
                        )
                    )

        return issues

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": "Validates schema types (JSON-LD), syntax, removed schemas, and Google Rich Result prerequisites.",
            "how_to_fix": "Add the missing Schema.org properties or fix JSON-LD syntax in your page template.",
        }
