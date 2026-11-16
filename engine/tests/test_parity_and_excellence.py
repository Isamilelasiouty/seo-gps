"""
Comprehensive Tests for Parity (Screaming Frog Equivalents) and Excellence Features.
Author: Ismail El Asiouty
"""
import pytest
from engine.custom_extraction import CustomExtractionEngine, extract_regex, extract_css_selector_simple
from engine.geo_readiness import audit_geo_readiness
from engine.action_planner import ActionPlanner, detect_framework
from engine.crawl_compare import CrawlComparator
from engine.checks.check_orphan_pages import OrphanPagesCheck
from engine.checks.check_crawl_depth import CrawlDepthCheck
from engine.checks.check_hreflang import HreflangCheck
from engine.checks.check_pagination import PaginationCheck
from engine.checks.check_ai_crawlers import AiCrawlersCheck
from engine.checks.check_near_duplicates import NearDuplicatesCheck, compute_simhash, hamming_distance


def test_custom_extraction():
    html = """
    <html>
      <head>
        <meta name="author" content="Ismail El Asiouty" />
      </head>
      <body>
        <div id="product-sku">SKU-9921</div>
        <span class="price">$149.99</span>
        <script>var config = {"api_key": "xyz_12345"};</script>
      </body>
    </html>
    """
    engine = CustomExtractionEngine([
        {"name": "Price", "type": "css", "target": ".price"},
        {"name": "SKU", "type": "css", "target": "#product-sku"},
        {"name": "Author", "type": "css", "target": 'meta[name="author"]'},
        {"name": "ApiKey", "type": "regex", "target": r'"api_key":\s*"([^"]+)"'},
    ])
    res = engine.execute(html)
    assert res["Price"] == ["$149.99"]
    assert res["SKU"] == ["SKU-9921"]
    assert res["Author"] == ["Ismail El Asiouty"]
    assert res["ApiKey"] == ["xyz_12345"]


def test_geo_readiness():
    html_low = "<html><body><p>Short unstructured paragraph.</p></body></html>"
    res_low = audit_geo_readiness(html_low, robots_txt="User-agent: GPTBot\nDisallow: /", schemas=[], word_count=50)
    assert res_low["geo_score"] < 50
    assert any("GPTBot" in b["details"] for b in res_low["breakdown"])

    html_high = """
    <html>
      <head>
        <meta name="author" content="Ismail El Asiouty" />
      </head>
      <body>
        <h2>What is Technical SEO?</h2>
        <p>Technical SEO is the process of optimizing website infrastructure.</p>
        <table><tr><th>Check</th><th>Importance</th></tr><tr><td>Status 200</td><td>Critical</td></tr></table>
        <ul><li>Speed</li><li>Canonicals</li><li>Robots</li></ul>
      </body>
    </html>
    """
    res_high = audit_geo_readiness(html_high, robots_txt="User-agent: *\nAllow: /", schemas=["Article", "FAQPage"], word_count=500)
    assert res_high["geo_score"] >= 80


def test_action_planner_and_patches():
    wp_html = "<html><head><link rel='stylesheet' href='/wp-content/themes/main.css'></head><body></body></html>"
    framework = detect_framework(wp_html)
    assert framework == "wordpress"

    planner = ActionPlanner(framework=framework)
    issues = [
        {
            "check_id": "http_status",
            "url": "https://example.com/broken-page",
            "title": "HTTP 404 Not Found",
            "severity": "critical",
            "evidence": {"status_code": 404},
        },
        {
            "check_id": "metadata",
            "url": "https://example.com/hidden-page",
            "title": "Page blocked by NOINDEX",
            "severity": "critical",
            "evidence": {},
        }
    ]
    plan = planner.generate_plan(issues)
    assert len(plan) == 2
    assert plan[0]["impact_effort_tier"] == "quick_win"
    assert "functions.php" in plan[0]["ready_code_patch"] or "wp_redirect" in plan[0]["ready_code_patch"]


def test_crawl_comparator():
    comparator = CrawlComparator()
    base_pages = [
        {"url": "https://example.com/", "statusCode": 200, "robots": "index, follow", "canonical": "https://example.com/"},
        {"url": "https://example.com/about", "statusCode": 200, "robots": "index, follow", "canonical": "https://example.com/about"},
        {"url": "https://example.com/old-blog", "statusCode": 200, "robots": "index, follow", "canonical": "https://example.com/old-blog"},
    ]
    curr_pages = [
        {"url": "https://example.com/", "statusCode": 200, "robots": "index, follow", "canonical": "https://example.com/"},
        {"url": "https://example.com/about", "statusCode": 200, "robots": "noindex, follow", "canonical": "https://example.com/about"},
        {"url": "https://example.com/pricing", "statusCode": 200, "robots": "index, follow", "canonical": "https://example.com/pricing"},
    ]
    diff = comparator.compare(base_pages, curr_pages, baseline_score=95, current_score=85)
    assert "https://example.com/pricing" in diff["added_urls"]
    assert "https://example.com/old-blog" in diff["removed_urls"]
    assert any(d["type"] == "noindex_introduced" for d in diff["directive_changes"])
    assert diff["summary"]["score_status"] == "degraded"


def test_orphan_pages_check():
    check = OrphanPagesCheck()
    snap = {
        "url": "https://example.com/hidden-service",
        "path": "/hidden-service",
        "source": "sitemap",
        "inlinks": [],
        "status_code": 200,
    }
    issues = check.analyze(snap, context={"inlink_counts": {"https://example.com/hidden-service": 0}})
    assert len(issues) == 1
    assert "يتيمة" in issues[0].title


def test_crawl_depth_check():
    check = CrawlDepthCheck()
    snap = {
        "url": "https://example.com/deep/sub/nested/page",
        "crawl_depth": 5,
        "status_code": 200,
    }
    issues = check.analyze(snap)
    assert len(issues) == 1
    assert issues[0].severity == "critical"
    assert "عمق نقر" in issues[0].title


def test_hreflang_check():
    check = HreflangCheck()
    snap = {
        "url": "https://example.com/ar/page",
        "hreflangs": [
            {"lang": "invalid-lang-code", "url": "https://example.com/xx/page"},
            {"lang": "en", "url": "https://example.com/en/page"},
        ]
    }
    issues = check.analyze(snap)
    assert len(issues) >= 2  # Invalid code and missing self-reference
    assert any("غير صالح" in i.title for i in issues)
    assert any("Missing Self-Referencing" in i.title or "يشير لنفس الصفحة" in i.title for i in issues)


def test_pagination_check():
    check = PaginationCheck()
    snap = {
        "url": "https://example.com/blog/page/2",
        "canonical_url": "https://example.com/blog",
        "robots": "noindex, follow",
    }
    issues = check.analyze(snap)
    assert len(issues) == 2  # Canonical to page 1 + noindex
    assert any("Canonical الصفحة الأولى" in i.title for i in issues)
    assert any("noindex على صفحة ترقيم" in i.title for i in issues)


def test_ai_crawlers_check():
    check = AiCrawlersCheck()
    snap = {"url": "https://example.com/", "path": "/"}
    context = {"robots_txt_content": "User-agent: GPTBot\nDisallow: /\nUser-agent: ClaudeBot\nDisallow: /"}
    issues = check.analyze(snap, context=context)
    assert len(issues) == 1
    assert "GPTBot" in issues[0].title


def test_near_duplicates_simhash():
    text1 = "This is an in-depth article about search engine optimization techniques for modern websites. " * 5
    text2 = "This is an in-depth article about search engine optimization strategies for modern websites. " * 5
    text3 = "Completely unrelated content about astrophysics, quantum mechanics, and cosmology. " * 5

    h1 = compute_simhash(text1)
    h2 = compute_simhash(text2)
    h3 = compute_simhash(text3)

    dist_close = hamming_distance(h1, h2)
    dist_far = hamming_distance(h1, h3)

    assert dist_close <= 10  # High similarity (>= 85%)
    assert dist_far >= 25    # Low similarity (~50% random overlap)
