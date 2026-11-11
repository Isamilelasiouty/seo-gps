"""
Transactional Email Delivery Service for SEO GPS.
Author: Ismail El Asiouty

Supports:
- First-Scan Baseline Report email
- Daily Alert email (New / Persisting / Resolved / Reappeared)
- Local outbox persistence (.local/outbox/) for offline testing and in-app preview
- Live delivery via Resend REST API
"""
import os
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import jinja2
import httpx


DEFAULT_FRONTEND_URL = os.getenv("FRONTEND_URL", "https://isamilelasiouty.github.io/seo-gps").rstrip("/")


def _slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "_", s)[:50]


class Mailer:
    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None, local_mode: Optional[bool] = None):
        self.api_key = api_key if api_key is not None else os.getenv("RESEND_API_KEY", "")
        self.from_email = from_email or os.getenv("EMAIL_FROM", "SEO GPS <onboarding@resend.dev>")
        
        # Local mode detected if explicitly set, or if LOCAL_MODE env var is 1, or if API key is empty/dummy
        if local_mode is not None:
            self.local_mode = local_mode
        else:
            self.local_mode = (
                os.getenv("LOCAL_MODE", "0") in ("1", "true", "True")
                or not self.api_key
                or self.api_key.startswith("re_12345")
                or self.api_key == "dummy"
            )

        templates_dir = Path(__file__).resolve().parent / "templates"
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(templates_dir)),
            autoescape=jinja2.select_autoescape(["html", "xml"]),
        )
        
        self.outbox_dir = Path(__file__).resolve().parent.parent.parent / ".local" / "outbox"
        if self.local_mode:
            self.outbox_dir.mkdir(parents=True, exist_ok=True)

    def render_templates(self, context: Dict[str, Any]) -> Dict[str, str]:
        html_tmpl = self.jinja_env.get_template("report.html")
        txt_tmpl = self.jinja_env.get_template("report.txt")
        return {
            "html": html_tmpl.render(context),
            "text": txt_tmpl.render(context),
        }

    def _save_to_outbox(self, recipients: List[str], subject: str, html: str, text: str, email_type: str = "report") -> str:
        """Save email to .local/outbox for inspection and local preview."""
        self.outbox_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        recip_slug = _slugify(recipients[0] if recipients else "unknown")
        subj_slug = _slugify(subject)
        base_name = f"{ts}_{recip_slug}_{subj_slug}"
        
        html_path = self.outbox_dir / f"{base_name}.html"
        json_path = self.outbox_dir / f"{base_name}.json"
        
        html_path.write_text(html, encoding="utf-8")
        
        meta = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "recipients": recipients,
            "from_email": self.from_email,
            "subject": subject,
            "type": email_type,
            "html_file": html_path.name,
            "text": text,
        }
        json_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[Mailer] Saved email to local outbox: {html_path.name}")
        return str(html_path)

    async def _deliver(self, recipients: List[str], subject: str, html: str, text: str, email_type: str) -> bool:
        """Route to local outbox or live Resend."""
        # Always save to local outbox if in local mode
        if self.local_mode:
            self._save_to_outbox(recipients, subject, html, text, email_type=email_type)
            print(f"[Mailer] [LOCAL OUTBOX] {email_type.upper()} sent to {recipients}: {subject}")
            return True

        # Send via Resend REST API
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": self.from_email,
            "to": recipients,
            "subject": subject,
            "html": html,
            "text": text,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    print(f"[Mailer] Successfully sent {email_type} for {recipients}")
                    return True
                else:
                    print(f"[Mailer] Resend API error ({res.status_code}): {res.text}")
                    if res.status_code == 403 and "verify a domain" in res.text:
                        print("[Mailer] NOTICE: Resend sandbox restriction active ('onboarding@resend.dev'). Only the account owner (ismailelasiouty3@gmail.com) can receive test emails directly until a custom domain is verified at https://resend.com/domains.")
                    # Fallback to local outbox so mail is never lost
                    self._save_to_outbox(recipients, subject, html, text, email_type=email_type)
                    return False
        except Exception as e:
            print(f"[Mailer] Delivery exception: {e}")
            self._save_to_outbox(recipients, subject, html, text, email_type=email_type)
            return False

    async def send_first_scan_report(
        self,
        recipients: List[str],
        domain: str,
        run_date: str,
        health_score: int,
        summary: Dict[str, Any],
        status_distribution: Dict[str, Any],
        category_counts: Dict[str, Any],
        severity_counts: Dict[str, Any],
        top_fixes: List[Any],
        report_url: Optional[str] = None,
        dashboard_url: Optional[str] = None,
    ) -> bool:
        """Compile and send the First Scan Baseline Report email."""
        base_url = (os.getenv("FRONTEND_URL") or DEFAULT_FRONTEND_URL).rstrip("/")
        report_url = report_url or f"{base_url}/#/site-report"
        dashboard_url = dashboard_url or f"{base_url}/#/"

        subject = f"[SEO GPS] Baseline Report: {domain} ({health_score}/100) - {summary.get('total_discovered', 0)} URLs discovered"
        context = {
            "subject": subject,
            "domain": domain,
            "run_date": run_date,
            "health_score": health_score,
            "summary": summary,
            "status_distribution": status_distribution,
            "category_counts": category_counts,
            "severity_counts": severity_counts,
            "top_fixes": top_fixes,
            "report_url": report_url,
            "dashboard_url": dashboard_url,
            "preferences_url": f"{dashboard_url}settings",
            "unsubscribe_url": f"{dashboard_url}unsubscribe",
        }

        html_tmpl = self.jinja_env.get_template("first_scan_report.html")
        txt_tmpl = self.jinja_env.get_template("first_scan_report.txt")
        html = html_tmpl.render(context)
        text = txt_tmpl.render(context)

        return await self._deliver(recipients, subject, html, text, email_type="first_scan_baseline")

    async def send_daily_alert(
        self,
        recipients: List[str],
        domain: str,
        run_date: str,
        health_score: int,
        summary: Dict[str, int],
        new_issues: List[Any],
        persisting_issues: List[Any],
        resolved_issues: List[Any],
        reappeared_issues: Optional[List[Any]] = None,
        email_policy: str = "send_every_run",  # or "send_on_delta"
        dashboard_url: Optional[str] = None,
    ) -> bool:
        """Compile and send the Daily Alert email."""
        base_url = (os.getenv("FRONTEND_URL") or DEFAULT_FRONTEND_URL).rstrip("/")
        dashboard_url = dashboard_url or f"{base_url}/#/"

        reappeared_issues = reappeared_issues or []
        new_count = summary.get("new_count", len(new_issues))
        persisting_count = summary.get("persisting_count", len(persisting_issues))
        baseline_count = summary.get("baseline_count", 0)
        resolved_count = summary.get("resolved_count", len(resolved_issues))
        reappeared_count = summary.get("reappeared_count", len(reappeared_issues))

        # Check email policy: send_on_delta skips if nothing new or reappeared or resolved
        if email_policy == "send_on_delta" and new_count == 0 and reappeared_count == 0 and resolved_count == 0:
            print(f"[Mailer] Skipping daily alert for {domain} (policy: send_on_delta and no deltas)")
            return False

        # Subject format e.g. [SEO GPS] example.com: 4 new, 37 still open, 2 resolved, 31 Oct
        subject = f"[SEO GPS] {domain}: {new_count} new, {persisting_count} still open, {resolved_count} resolved, {run_date}"
        
        context = {
            "subject": subject,
            "domain": domain,
            "run_date": run_date,
            "health_score": health_score,
            "summary": {
                "new_count": new_count,
                "persisting_count": persisting_count,
                "baseline_count": baseline_count,
                "resolved_count": resolved_count,
                "reappeared_count": reappeared_count,
            },
            "new_issues": new_issues,
            "persisting_issues": persisting_issues,
            "resolved_issues": resolved_issues,
            "reappeared_issues": reappeared_issues,
            "issues_url": f"{dashboard_url}issues",
            "dashboard_url": dashboard_url,
            "preferences_url": f"{dashboard_url}settings",
            "unsubscribe_url": f"{dashboard_url}unsubscribe",
        }

        html_tmpl = self.jinja_env.get_template("daily_alert.html")
        txt_tmpl = self.jinja_env.get_template("daily_alert.txt")
        html = html_tmpl.render(context)
        text = txt_tmpl.render(context)

        return await self._deliver(recipients, subject, html, text, email_type="daily_alert")

    async def send_report(
        self,
        recipients: List[str],
        domain: str,
        run_date: str,
        health_score: int,
        critical_issues: List[Any],
        warning_issues: List[Any],
        notice_issues: List[Any],
        resolved_issues: List[Any],
        dashboard_url: Optional[str] = None,
    ) -> bool:
        """Legacy helper maintained for backward compatibility."""
        base_url = (os.getenv("FRONTEND_URL") or DEFAULT_FRONTEND_URL).rstrip("/")
        dashboard_url = dashboard_url or f"{base_url}/#/"
        summary = {
            "new_count": len(critical_issues) + len(warning_issues) + len(notice_issues),
            "persisting_count": 0,
            "resolved_count": len(resolved_issues),
            "reappeared_count": 0,
        }
        all_new = critical_issues + warning_issues + notice_issues
        return await self.send_daily_alert(
            recipients=recipients,
            domain=domain,
            run_date=run_date,
            health_score=health_score,
            summary=summary,
            new_issues=all_new,
            persisting_issues=[],
            resolved_issues=resolved_issues,
            dashboard_url=dashboard_url,
        )
