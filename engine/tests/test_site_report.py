"""
Comprehensive Golden Test Suite for Site Report and Issue Lifecycle.
Author: Ismail El Asiouty
"""
import json
import pytest
import threading
import time
from pathlib import Path
import httpx

from engine.tests.fixture_site import run_fixture_server
from engine.storage import LocalStorage
from engine.main import run_audit_for_project
from engine.url_sanitizer import (
    sanitize_url,
    recover_slug,
    match_dead_page_redirect,
    generate_redirect_rules,
)
from engine.content_analyzers import (
    scan_outdated_years,
    analyze_title_meta_quality,
    classify_url_taxonomy,
    generate_faq_json_ld,
    extract_real_faq_items,
    build_deterministic_action_plan,
)
from engine.verify import ReportVerifier


@pytest.fixture(scope="session")
def fixture_server():
    server = run_fixture_server(port=8099)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.4)
    yield server
    server.shutdown()


def test_url_sanitizer():
    # 1. Leading whitespace / %20
    s1, defects1 = sanitize_url("  http://example.com/%20programs/cs  ")
    assert defects1
    assert "whitespace_padding" in defects1 or "leading_whitespace" in defects1
    assert s1 == "http://example.com/programs/cs"

    # 2. Unicode NFC normalization & double slashes
    s2, defects2 = sanitize_url("http://example.com//programs//admission")
    assert "double_slash_in_path" in defects2 or "consecutive_slashes" in defects2
    assert s2 == "http://example.com/programs/admission"


def test_redirect_rules_generator():
    rules = generate_redirect_rules(
        source_url="http://example.com/chain-step-1",
        target_url="http://example.com/programs/computer-science",
        code=301,
    )
    assert "nginx" in rules
    assert "htaccess" in rules
    assert "rewrite" in rules["nginx"] and "computer-science" in rules["nginx"]
    assert "RewriteRule" in rules["htaccess"] and "computer-science" in rules["htaccess"]


def test_slug_recovery():
    known_urls = [
        "http://example.com/دليل-القبول-الموحد",
        "http://example.com/computer-science-program",
        "http://example.com/business-administration",
    ]
    
    # Truncated Arabic slug
    res = recover_slug("http://example.com/دليل-القبول", known_urls, min_confidence=0.60)
    assert res is not None
    assert res["matched_slug"] == "دليل-القبول-الموحد"
    assert res["confidence"] >= 0.60


def test_year_pattern_scanner():
    findings = scan_outdated_years(
        text="تنسيق كلية الطب لعام 2024 وشروط 2023",
        target_year=2027,
    )
    years_found = [f["detected_year"] for f in findings]
    assert "2024" in years_found
    assert "2023" in years_found
    assert findings[0]["target_year"] == 2027


def test_ctr_keyword_analyzer():
    res = analyze_title_meta_quality(
        title="كلية الطب",
        description="معلومات عامة",
        h1="الرئيسية",
        ctr_keywords=["شروط", "مصاريف", "رسوم", "قبول", "fees", "admission"],
    )
    assert res["has_ctr_triggers"] is False
    assert len(res["issues"]) > 0


def test_faq_jsonld_generator():
    html = """
    <h2>الأسئلة الشائعة</h2>
    <h3>ما هي شروط القبول؟</h3>
    <p>الحصول على شهادة الثانوية العامة بمعدل 70% على الأقل.</p>
    <h3>كم تبلغ الرسوم الدراسية؟</h3>
    <p>تبلغ الرسوم السنوية 50000 جنيه مصري.</p>
    """
    qa_pairs = extract_real_faq_items(html)
    assert len(qa_pairs) == 2
    jsonld_str = generate_faq_json_ld(qa_pairs)
    data = json.loads(jsonld_str)
    assert data["@type"] == "FAQPage"
    assert len(data["mainEntity"]) == 2


@pytest.mark.asyncio
async def test_end_to_end_fixture_audit(fixture_server):
    storage = LocalStorage()
    storage.delete_project("fixture-test-e2e")
    
    # Reset fixture to Day 1
    httpx.post("http://127.0.0.1:8099/__state?day=1")

    proj = {
        "id": "fixture-test-e2e",
        "name": "Fixture University E2E",
        "domain": "127.0.0.1:8099",
        "root_url": "http://127.0.0.1:8099/",
        "sitemap_url": "http://127.0.0.1:8099/sitemap.xml",
        "recipients": ["e2e@test.local"],
    }

    # Day 1: Baseline Scan
    res_day1 = await run_audit_for_project(proj, scan_type="baseline", storage=storage, local_mode=True)
    assert res_day1["is_baseline"] is True
    assert res_day1["verification"]["passed"] is True
    assert res_day1["stats"]["total_crawled"] > 0
    assert len(res_day1["reconciliation"]["active_issues"]) > 0

    # Verify Golden Issues
    golden_path = Path(__file__).parent / "golden_issues.json"
    with open(golden_path, "r", encoding="utf-8") as f:
        golden = json.load(f)

    active_issues = res_day1["reconciliation"]["active_issues"]
    active_urls = [i.get("url", "") for i in active_issues]

    for expected in golden.get("key_findings", []):
        matches = [u for u in active_urls if expected["url_contains"] in u]
        assert len(matches) > 0, f"Expected golden issue URL containing '{expected['url_contains']}' not found in active issues"

    # Day 2: Daily Scan
    httpx.post("http://127.0.0.1:8099/__state?day=2")
    res_day2 = await run_audit_for_project(proj, scan_type="daily", storage=storage, local_mode=True)
    assert res_day2["is_baseline"] is False
    assert res_day2["verification"]["passed"] is True

    recon = res_day2["reconciliation"]
    # Dead page was restored -> resolved
    resolved_urls = [r.get("url", "") for r in recon["resolved_issues"]]
    assert any("true-dead-page-xyz" in u for u in resolved_urls)

    # New broken link appeared -> new
    new_urls = [n.get("url", "") for n in recon["new_issues"]]
    assert any("new-broken-link" in u for u in new_urls)
