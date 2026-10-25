"""
End-to-End Regression Audit Simulation Test.
Author: Ismail El Asiouty
"""
import pytest
import asyncio
from engine.crawler import PoliteCrawler
from engine.diff import DiffEngine
from engine.mail.mailer import Mailer
from engine.tests.fixture_server import FixtureServer


@pytest.mark.asyncio
async def test_end_to_end_regression_flow():
    # 1. Start Mock Server
    server = FixtureServer(port=8088)
    server.start()
    server.set_regression(False)  # Healthy baseline

    try:
        # 2. Run Baseline Crawl
        crawler = PoliteCrawler(domain="127.0.0.1:8088", max_pages=10, allow_local=True)
        baseline_snapshots = await crawler.crawl(
            root_url="http://127.0.0.1:8088/",
            sitemap_url="http://127.0.0.1:8088/sitemap.xml"
        )
        assert len(baseline_snapshots) >= 3

        # 3. Simulate Day 2: Introduce Regressions!
        server.set_regression(True)

        crawler_day2 = PoliteCrawler(domain="127.0.0.1:8088", max_pages=10, allow_local=True)
        regressed_snapshots = await crawler_day2.crawl(
            root_url="http://127.0.0.1:8088/",
            sitemap_url="http://127.0.0.1:8088/sitemap.xml"
        )

        # 4. Run Diff Engine
        diff_engine = DiffEngine()
        issues, resolved, health_score = diff_engine.compare_snapshots(
            current_snapshots=regressed_snapshots,
            previous_snapshots=baseline_snapshots,
            is_first_run=False
        )

        # 5. Verify Regressions Detected
        crit_issues = [i for i in issues if i.severity == "critical"]
        assert len(crit_issues) >= 2

        # 404 detected on /pricing
        assert any(i.check_id == "http_status" and "404" in i.title for i in crit_issues)

        # NOINDEX detected on /about
        assert any(i.check_id == "metadata" and "NOINDEX" in i.title for i in crit_issues)

        # Health score plummeted
        assert health_score < 80

        # 6. Test Mailer Delta Report Generation
        mailer = Mailer()
        context = {
            "subject": "[2 Critical] 127.0.0.1:8088: SEO changes detected",
            "domain": "127.0.0.1:8088",
            "run_date": "2026-10-25",
            "health_score": health_score,
            "critical_count": len(crit_issues),
            "warning_count": 0,
            "notice_count": 0,
            "critical_issues": crit_issues,
            "warning_issues": [],
            "notice_issues": [],
            "resolved_issues": [],
            "dashboard_url": "https://isamilelasiouty.github.io/seo-gps",
            "preferences_url": "https://isamilelasiouty.github.io/seo-gps/#/settings",
            "unsubscribe_url": "https://isamilelasiouty.github.io/seo-gps/#/unsubscribe",
        }
        templates = mailer.render_templates(context)
        assert "404" in templates["html"]
        assert "NOINDEX" in templates["html"]
        assert "Ismail El Asiouty" in templates["html"]

    finally:
        server.stop()
