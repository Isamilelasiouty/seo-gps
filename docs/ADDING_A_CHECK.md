# How to Add a New SEO Check (Plugin Contract)

**SEO GPS** uses an auto-registering plugin architecture. Adding a new check requires **creating only one Python file** in `engine/checks/`. You never need to touch the crawler, the diff engine, or the core database queries.

---

## 1. The Check Contract

Every check inherits from `BaseCheck` and implements:
- `id`: Unique lowercase identifier (e.g. `check_hreflang`)
- `title`: User-facing title in the dashboard
- `category`: Grouping (`status`, `canonical`, `metadata`, `sitemap`, `schema`, `subdomains`, `similarity`)
- `default_severity`: `critical`, `warning`, or `notice`
- `analyze(current_snapshot, previous_snapshot, context) -> list[Issue]`
- `get_metadata() -> dict`: Description and resolution instructions for the UI.

---

## 2. Worked Example: `check_missing_h1.py`

This worked example already exists in `engine/checks/check_missing_h1.py`:

```python
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue

class MissingH1Check(BaseCheck):
    id = "missing_h1"
    title = "Primary Heading (H1) Tag Auditing"
    category = "metadata"
    default_severity = "notice"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues = []
        url = current_snapshot.get("url", "")
        h1_tags = current_snapshot.get("h1_tags", [])

        if not h1_tags:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=url,
                    title="Missing H1 heading tag",
                    details="Page does not declare an <h1> heading tag.",
                    after_state={"h1_count": 0},
                )
            )
        return issues
```

---

## 3. How Auto-Discovery Works

The `CheckRegistry` scans `engine/checks/` on startup using Python's `pkgutil`. As soon as your file is saved:
1. The engine automatically executes it during daily crawls.
2. Detected issues are stored in the database.
3. The frontend displays the issue in the Issues explorer automatically.

---

## 4. Verification

Run the test suite:
```bash
pytest engine/tests/test_checks.py
```
