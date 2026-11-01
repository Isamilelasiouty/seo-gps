"""
Redirect Chains & Loops Check for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue
from engine.url_sanitizer import generate_redirect_rules


class RedirectChainsCheck(BaseCheck):
    id = "check_redirect_chains"
    title = "Redirect Chains and Loops"
    category = "redirects"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues: List[Issue] = []
        chain = current_snapshot.get("redirect_chain", [])
        url = current_snapshot.get("url", "")
        final_url = current_snapshot.get("final_url", url)

        # 1. Loop detection
        if len(chain) > 1:
            hop_urls = [str(h.get("url") or h.get("target_url") or "") for h in chain if isinstance(h, dict)]
            hop_urls = [u for u in hop_urls if u]
            if len(hop_urls) != len(set(hop_urls)):
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity="critical",
                        category=self.category,
                        confidence="high",
                        url=url,
                        title="Redirect loop detected",
                        details=f"URL enters an infinite redirect loop: {' -> '.join(hop_urls[:5])}",
                        evidence={"chain": chain, "hops": len(chain)},
                        suggestion={"action": "Break the loop and point directly to final destination"},
                    )
                )
                return issues

        # 2. Redirect chain (more than 1 hop)
        if len(chain) > 1:
            rules = generate_redirect_rules(url, final_url, 301)
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    confidence="high",
                    url=url,
                    title=f"Redirect chain with {len(chain)} hops",
                    details=f"URL redirects through {len(chain)} hops before reaching {final_url}.",
                    evidence={
                        "chain": chain,
                        "hops": len(chain),
                        "source_url": url,
                        "final_url": final_url,
                    },
                    suggestion={
                        "action": f"Collapse redirect chain to point directly to {final_url}",
                        "nginx": rules.get("nginx"),
                        "htaccess": rules.get("htaccess"),
                    },
                )
            )

        return issues
