"""
Transactional Email Delivery Service for SEO GPS.
Author: Ismail El Asiouty
"""
import os
from pathlib import Path
from typing import Dict, Any, List
import jinja2
import httpx


class Mailer:
    def __init__(self, api_key: str = None, from_email: str = None):
        self.api_key = api_key or os.getenv("RESEND_API_KEY", "")
        self.from_email = from_email or os.getenv("EMAIL_FROM", "SEO GPS <onboarding@resend.dev>")
        templates_dir = Path(__file__).parent / "templates"
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(templates_dir)),
            autoescape=jinja2.select_autoescape(["html", "xml"]),
        )

    def render_templates(self, context: Dict[str, Any]) -> Dict[str, str]:
        html_tmpl = self.jinja_env.get_template("report.html")
        txt_tmpl = self.jinja_env.get_template("report.txt")
        return {
            "html": html_tmpl.render(context),
            "text": txt_tmpl.render(context),
        }

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
        dashboard_url: str = "https://isamilelasiouty.github.io/seo-gps",
    ) -> bool:
        crit_count = len(critical_issues)
        warn_count = len(warning_issues)
        notice_count = len(notice_issues)
        total_deltas = crit_count + warn_count + notice_count + len(resolved_issues)

        # Delta-only rule: do not email if nothing changed
        if total_deltas == 0:
            print(f"[Mailer] No deltas detected for {domain}. Skipping email according to delta-only rule.")
            return False

        subject = f"[{crit_count} Critical | {warn_count} Warning] {domain}: SEO changes detected, {run_date}"
        context = {
            "subject": subject,
            "domain": domain,
            "run_date": run_date,
            "health_score": health_score,
            "critical_count": crit_count,
            "warning_count": warn_count,
            "notice_count": notice_count,
            "critical_issues": critical_issues,
            "warning_issues": warning_issues,
            "notice_issues": notice_issues,
            "resolved_issues": resolved_issues,
            "dashboard_url": dashboard_url,
            "preferences_url": f"{dashboard_url}/#/settings",
            "unsubscribe_url": f"{dashboard_url}/#/unsubscribe",
        }

        rendered = self.render_templates(context)

        # If no Resend API key configured, output to console for zero-cost / local testing
        if not self.api_key or self.api_key.startswith("re_12345"):
            print(f"[Mailer] Simulated Email Send for {domain} to {recipients}:")
            print(f"Subject: {subject}")
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
            "html": rendered["html"],
            "text": rendered["text"],
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    print(f"[Mailer] Successfully sent report for {domain} to {recipients}")
                    return True
                else:
                    print(f"[Mailer] Resend API error ({res.status_code}): {res.text}")
                    return False
        except Exception as e:
            print(f"[Mailer] Delivery exception: {e}")
            return False
