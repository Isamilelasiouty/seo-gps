"""
Base check classes, issue definitions, and fingerprint calculation for SEO GPS.
Author: Ismail El Asiouty
"""
import hashlib
import json
import unicodedata
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    """Deterministic URL normalizer: lowercase scheme & host, strip fragment, NFC normalization."""
    if not url:
        return ""
    # NFC normalization for Unicode/Arabic
    norm = unicodedata.normalize("NFC", url.strip())
    try:
        parsed = urlparse(norm)
        scheme = parsed.scheme.lower() or "https"
        netloc = parsed.netloc.lower()
        path = parsed.path or "/"
        # Collapse multiple slashes
        while "//" in path:
            path = path.replace("//", "/")
        # Reconstruct without fragment
        clean = urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))
        return clean.rstrip("/") if path != "/" else clean
    except Exception:
        return norm


@dataclass
class Issue:
    check_id: str
    severity: str  # 'critical', 'warning', 'notice', 'healthy'
    category: str  # 'status', 'canonical', 'metadata', 'sitemap', 'schema', 'similarity', 'quality', 'taxonomy'
    url: str
    title: str
    details: str
    before_state: Dict[str, Any] = field(default_factory=dict)
    after_state: Dict[str, Any] = field(default_factory=dict)
    status: str = "new"  # 'new', 'persisting', 'resolved', 'reappeared', 'ignored', 'open'
    fingerprint: str = ""
    confidence: str = "high"  # 'high', 'medium', 'low'
    evidence: Dict[str, Any] = field(default_factory=dict)
    suggestion: Dict[str, Any] = field(default_factory=dict)
    days_open: int = 0
    is_baseline: bool = False
    first_seen_scan_id: Optional[str] = None
    last_seen_scan_id: Optional[str] = None
    resolved_scan_id: Optional[str] = None

    def __post_init__(self):
        if not self.fingerprint:
            self.fingerprint = self.compute_fingerprint()
        if not self.evidence:
            # Guarantee evidence per accuracy standard
            self.evidence = {
                "url": self.url,
                "check_id": self.check_id,
                "category": self.category,
                "title": self.title,
                "details": self.details,
            }

    def compute_fingerprint(self) -> str:
        """
        Deterministic fingerprint: stable hash of check_id + normalized URL + defining problem attributes.
        """
        norm_url = normalize_url(self.url)
        # Combine check_id, normalized_url, and defining title/state attributes
        defining_key = f"{self.check_id}:{norm_url}:{self.title}"
        return hashlib.sha256(defining_key.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_id": self.check_id,
            "severity": self.severity,
            "category": self.category,
            "url": self.url,
            "title": self.title,
            "details": self.details,
            "before_state": self.before_state,
            "after_state": self.after_state,
            "status": self.status,
            "fingerprint": self.fingerprint,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "suggestion": self.suggestion,
            "days_open": self.days_open,
            "is_baseline": self.is_baseline,
            "first_seen_scan_id": self.first_seen_scan_id,
            "last_seen_scan_id": self.last_seen_scan_id,
            "resolved_scan_id": self.resolved_scan_id,
        }


class BaseCheck(ABC):
    """
    Every check in SEO GPS must inherit from BaseCheck and be placed in engine/checks/
    """
    id: str = ""
    title: str = ""
    category: str = ""
    default_severity: str = "warning"

    @abstractmethod
    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        """
        Analyze current snapshot vs previous snapshot.
        Returns a list of Issue objects.
        """
        pass

    def get_metadata(self) -> Dict[str, Any]:
        """
        Metadata describing how the UI renders this check.
        """
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "default_severity": self.default_severity,
            "help_text": self.__doc__ or "",
            "how_to_fix": "Follow standard SEO guidelines to rectify this issue.",
        }
