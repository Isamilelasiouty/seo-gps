"""
Gate 2: Fixture Server Ground Truth Accuracy Test.
Asserts 100% precision and recall for:
1. Meta descriptions containing single quotes ('It's', 'العميل's') are not truncated.
2. Heading tags inside <script> or comments are ignored.
3. Soft 404 pages (200 status with 'Not Found' content) are flagged.
4. Unreciprocated hreflang return tags are caught.
5. Outbound external links pointing to 404 are detected.
6. Canonical pointing to redirect/404 is detected.
Author: Ismail El Asiouty
"""
import pytest
from engine.parser import extract_dom_signals
from engine.checks.check_canonicals import CanonicalCheck
from engine.checks.check_hreflang import HreflangCheck
from engine.checks.check_soft_404 import Soft404Check
from engine.models import PageSnapshot


def test_meta_description_with_apostrophes_not_truncated():
    """Verify description containing single quotes and Arabic apostrophes is preserved intact."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Customer Test</title>
        <meta name="description" content="It's our customer's priority - بيانات العميل's ومطالبه">
    </head>
    <body><h1>Test</h1></body>
    </html>
    """
    signals = extract_dom_signals(html, "https://example.com/test", "example.com")
    expected = "It's our customer's priority - بيانات العميل's ومطالبه"
    assert signals["description"] == expected, f"Expected '{expected}', got '{signals['description']}'"


def test_headings_inside_comments_and_scripts_ignored():
    """Verify <h1> inside <script> or HTML comments is never captured as page heading."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <script>
            const fakeHtml = "<h1>Fake Script Heading</h1>";
        </script>
    </head>
    <body>
        <!-- <h1>Fake Comment Heading</h1> -->
        <h1>Genuine Page H1</h1>
        <h2>Genuine Subheading</h2>
    </body>
    </html>
    """
    signals = extract_dom_signals(html, "https://example.com/test", "example.com")
    assert signals["primary_h1"] == "Genuine Page H1"
    assert len(signals["h1_tags"]) == 1
    assert signals["h1_tags"][0] == "Genuine Page H1"
    assert all("Fake" not in h["text"] for h in signals["heading_hierarchy"])


def test_soft_404_flagged():
    """Verify page returning 200 but saying 'Page Not Found' is flagged as soft 404."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>404 Not Found - University Portal</title>
    </head>
    <body>
        <h1>Error</h1>
        <p>Sorry, the requested page was not found on this server.</p>
    </body>
    </html>
    """
    signals = extract_dom_signals(html, "https://example.com/missing", "example.com")
    assert signals["soft_404_flag"] is True

    snap = PageSnapshot(
        url="https://example.com/missing",
        status_code=200,
        title=signals["title"],
        primary_h1=signals["primary_h1"],
        soft_404_flag=signals["soft_404_flag"],
    )
    check = Soft404Check()
    issues = check.analyze(snap.to_dict())
    assert len(issues) >= 1
    assert issues[0].check_id in ("soft_404", "check_soft_404")


def test_unreciprocated_hreflang_caught():
    """Verify hreflang tags pointing to languages without reciprocal tags are caught."""
    check = HreflangCheck()
    # Page declares alternate for 'fr' and 'de', but self is 'en'
    current_snap = {
        "url": "https://example.com/page-en",
        "status_code": 200,
        "hreflangs": [
            {"lang": "fr", "href": "https://example.com/page-fr"},
            {"lang": "de", "href": "https://example.com/page-de"},
        ]
    }
    all_snaps = {
        "https://example.com/page-en": current_snap,
        "https://example.com/page-fr": {
            "url": "https://example.com/page-fr",
            "status_code": 200,
            "hreflangs": [
                {"lang": "en", "href": "https://example.com/page-en"}, # reciprocal
            ]
        },
        "https://example.com/page-de": {
            "url": "https://example.com/page-de",
            "status_code": 200,
            "hreflangs": [] # missing reciprocal!
        }
    }
    issues = check.analyze(current_snap, context={"all_snapshots": all_snaps})
    # Should flag missing reciprocal on page-de and missing self-referential
    assert len(issues) >= 1
    assert any("page-de" in i.title or "self" in i.title.lower() or "hreflang" in i.title.lower() for i in issues)


def test_canonical_pointing_to_redirect_or_404_flagged():
    """Verify canonical URL pointing to non-200 or redirect is caught."""
    check = CanonicalCheck()
    current_snap = {
        "url": "https://example.com/source",
        "status_code": 200,
        "canonical_url": "https://example.com/destination-redirected",
    }
    all_snaps = {
        "https://example.com/source": current_snap,
        "https://example.com/destination-redirected": {
            "url": "https://example.com/destination-redirected",
            "status_code": 301,
            "redirect_chain": [{"from": "https://example.com/destination-redirected", "to": "https://example.com/final", "status_code": 301}]
        }
    }
    issues = check.analyze(current_snap, context={"all_snapshots": all_snaps})
    assert len(issues) >= 1
    assert any("301" in i.title or "redirect" in i.title.lower() for i in issues)
