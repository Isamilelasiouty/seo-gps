"""
Deterministic Issue Lifecycle & Fingerprint Reconciliation Engine for SEO GPS.
Author: Ismail El Asiouty
"""
import uuid
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from engine.checks.base import Issue, normalize_url


class IssueLifecycleManager:
    """
    Manages deterministic reconciliation of issues between baseline & daily scans.
    Guarantees idempotency and complete provenance tracking.
    """

    @staticmethod
    def reconcile(
        project_id: str,
        scan_id: str,
        is_baseline: bool,
        current_issues: List[Issue],
        stored_issues: List[Dict[str, Any]],
        scan_time: Optional[datetime] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, int]]:
        """
        Reconciles current detected issues with existing stored issues.
        Returns:
            - updated_issues: list of issue dicts ready for persistence
            - events: list of issue_event dicts
            - counters: summary dictionary of lifecycle counts
        """
        now = scan_time or datetime.now()
        stored_by_fp: Dict[str, Dict[str, Any]] = {
            i.get("fingerprint") or i.get("id"): dict(i)
            for i in stored_issues
            if i.get("fingerprint") or i.get("id")
        }

        current_by_fp: Dict[str, Issue] = {}
        for issue in current_issues:
            fp = issue.fingerprint or issue.compute_fingerprint()
            issue.fingerprint = fp
            current_by_fp[fp] = issue

        reconciled: List[Dict[str, Any]] = []
        events: List[Dict[str, Any]] = []

        counters = {
            "new": 0,
            "persisting": 0,
            "persisting_baseline": 0,
            "resolved": 0,
            "reappeared": 0,
            "ignored": 0,
        }

        # Case 1: Baseline Scan
        if is_baseline:
            for fp, issue in current_by_fp.items():
                issue_dict = issue.to_dict()
                issue_id = issue_dict.get("id") or str(uuid.uuid4())
                issue_dict["id"] = issue_id
                issue_dict["project_id"] = project_id
                issue_dict["status"] = "persisting"  # Open since first scan
                issue_dict["is_baseline"] = True
                issue_dict["days_open"] = 0
                issue_dict["first_seen_scan_id"] = scan_id
                issue_dict["last_seen_scan_id"] = scan_id
                issue_dict["first_seen_at"] = now.isoformat()
                issue_dict["last_seen_at"] = now.isoformat()

                reconciled.append(issue_dict)
                counters["persisting"] += 1
                counters["persisting_baseline"] += 1

                events.append({
                    "issue_id": issue_id,
                    "project_id": project_id,
                    "scan_id": scan_id,
                    "fingerprint": fp,
                    "from_status": None,
                    "to_status": "persisting",
                    "event_type": "detected",
                    "details": {"reason": "Initial baseline scan discovery"},
                    "created_at": now.isoformat(),
                })

            return reconciled, events, counters

        # Case 2: Daily Scan Reconciliation
        # Step A: Process all current issues
        seen_fingerprints = set()

        for fp, issue in current_by_fp.items():
            seen_fingerprints.add(fp)
            issue_dict = issue.to_dict()
            issue_dict["project_id"] = project_id

            if fp in stored_by_fp:
                prev = stored_by_fp[fp]
                prev_id = prev.get("id") or str(uuid.uuid4())
                issue_dict["id"] = prev_id
                prev_status = prev.get("status", "open")

                # If previously ignored by user, keep ignored
                if prev_status == "ignored":
                    issue_dict["status"] = "ignored"
                    issue_dict["is_baseline"] = prev.get("is_baseline", False)
                    issue_dict["first_seen_scan_id"] = prev.get("first_seen_scan_id")
                    issue_dict["last_seen_scan_id"] = scan_id
                    issue_dict["first_seen_at"] = prev.get("first_seen_at", now.isoformat())
                    issue_dict["last_seen_at"] = now.isoformat()
                    issue_dict["days_open"] = IssueLifecycleManager._calc_days_open(prev.get("first_seen_at"), now)
                    reconciled.append(issue_dict)
                    counters["ignored"] += 1
                    continue

                # If previously resolved -> reappeared!
                if prev_status == "resolved":
                    issue_dict["status"] = "reappeared"
                    issue_dict["is_baseline"] = prev.get("is_baseline", False)
                    issue_dict["first_seen_scan_id"] = prev.get("first_seen_scan_id")
                    issue_dict["last_seen_scan_id"] = scan_id
                    issue_dict["resolved_scan_id"] = None
                    issue_dict["first_seen_at"] = prev.get("first_seen_at", now.isoformat())
                    issue_dict["last_seen_at"] = now.isoformat()
                    issue_dict["days_open"] = 0
                    reconciled.append(issue_dict)
                    counters["reappeared"] += 1

                    events.append({
                        "issue_id": prev_id,
                        "project_id": project_id,
                        "scan_id": scan_id,
                        "fingerprint": fp,
                        "from_status": "resolved",
                        "to_status": "reappeared",
                        "event_type": "reappeared",
                        "details": {"previous_resolution": prev.get("resolved_at")},
                        "created_at": now.isoformat(),
                    })
                    continue

                # Otherwise: persisting (was open, still open)
                days_open = IssueLifecycleManager._calc_days_open(prev.get("first_seen_at"), now)
                is_base = prev.get("is_baseline", False)

                issue_dict["status"] = "persisting"
                issue_dict["is_baseline"] = is_base
                issue_dict["days_open"] = days_open
                issue_dict["first_seen_scan_id"] = prev.get("first_seen_scan_id") or scan_id
                issue_dict["last_seen_scan_id"] = scan_id
                issue_dict["first_seen_at"] = prev.get("first_seen_at", now.isoformat())
                issue_dict["last_seen_at"] = now.isoformat()
                reconciled.append(issue_dict)
                counters["persisting"] += 1
                if is_base:
                    counters["persisting_baseline"] += 1

                if prev_status != "persisting":
                    events.append({
                        "issue_id": prev_id,
                        "project_id": project_id,
                        "scan_id": scan_id,
                        "fingerprint": fp,
                        "from_status": prev_status,
                        "to_status": "persisting",
                        "event_type": "persisted",
                        "details": {"days_open": days_open, "is_baseline": is_base},
                        "created_at": now.isoformat(),
                    })
            else:
                # Brand new issue discovered today!
                new_id = str(uuid.uuid4())
                issue_dict["id"] = new_id
                issue_dict["status"] = "new"
                issue_dict["is_baseline"] = False
                issue_dict["days_open"] = 0
                issue_dict["first_seen_scan_id"] = scan_id
                issue_dict["last_seen_scan_id"] = scan_id
                issue_dict["first_seen_at"] = now.isoformat()
                issue_dict["last_seen_at"] = now.isoformat()
                reconciled.append(issue_dict)
                counters["new"] += 1

                events.append({
                    "issue_id": new_id,
                    "project_id": project_id,
                    "scan_id": scan_id,
                    "fingerprint": fp,
                    "from_status": None,
                    "to_status": "new",
                    "event_type": "detected",
                    "details": {"reason": "Newly emerged regression"},
                    "created_at": now.isoformat(),
                })

        # Step B: Process stored issues that were NOT seen in current scan
        for fp, prev in stored_by_fp.items():
            if fp not in seen_fingerprints:
                prev_status = prev.get("status", "open")
                prev_id = prev.get("id") or str(uuid.uuid4())
                if prev_status in ("new", "persisting", "reappeared", "open"):
                    resolved_issue = dict(prev)
                    resolved_issue["id"] = prev_id
                    resolved_issue["status"] = "resolved"
                    resolved_issue["resolved_scan_id"] = scan_id
                    resolved_issue["resolved_at"] = now.isoformat()
                    resolved_issue["last_seen_at"] = now.isoformat()
                    reconciled.append(resolved_issue)
                    counters["resolved"] += 1

                    events.append({
                        "issue_id": prev_id,
                        "project_id": project_id,
                        "scan_id": scan_id,
                        "fingerprint": fp,
                        "from_status": prev_status,
                        "to_status": "resolved",
                        "event_type": "resolved",
                        "details": {"resolved_scan_id": scan_id},
                        "created_at": now.isoformat(),
                    })
                elif prev_status in ("resolved", "ignored"):
                    # Preserve existing resolved / ignored state
                    reconciled.append(dict(prev))
                    if prev_status == "ignored":
                        counters["ignored"] += 1

        return reconciled, events, counters

    @staticmethod
    def _calc_days_open(first_seen: Optional[str], current_time: datetime) -> int:
        if not first_seen:
            return 0
        try:
            # Handle ISO string with or without Z/offset
            fs_str = first_seen.replace("Z", "+00:00")
            dt = datetime.fromisoformat(fs_str)
            # Remove tzinfo for simple date difference
            d1 = dt.date()
            d2 = current_time.date()
            return max(0, (d2 - d1).days)
        except Exception:
            return 0
