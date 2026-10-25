"""
Base check classes and issue definitions for SEO GPS.
Author: Ismail El Asiouty
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod


@dataclass
class Issue:
    check_id: str
    severity: str  # 'critical', 'warning', 'notice', 'healthy'
    category: str  # 'status', 'canonical', 'metadata', 'sitemap', 'schema', 'subdomains', 'similarity'
    url: str
    title: str
    details: str
    before_state: Dict[str, Any] = field(default_factory=dict)
    after_state: Dict[str, Any] = field(default_factory=dict)
    status: str = "open"  # 'open', 'resolved', 'ignored'

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
