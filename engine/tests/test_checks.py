"""
Unit tests for SEO GPS Check Modules and Diff Engine.
Author: Ismail El Asiouty
"""
import pytest
from engine.checks.check_http_status import HttpStatusCheck
from engine.checks.check_canonicals import CanonicalCheck
from engine.checks.check_metadata import MetadataCheck
from engine.checks.check_sitemap import SitemapCheck
from engine.checks.check_schema import SchemaCheck
from engine.checks.check_subdomains import SubdomainExposureCheck
from engine.checks.check_similarity import SimilarityCheck
from engine.checks.check_missing_h1 import MissingH1Check
from engine.diff import DiffEngine


def test_http_status_check():
    check = HttpStatusCheck()
    current = {"url": "https://example.com/page", "status_code": 404, "response_time_ms": 120}
    prev = {"url": "https://example.com/page", "status_code": 200, "response_time_ms": 110}

    issues = check.analyze(current, prev)
    assert len(issues) == 1
    assert issues[0].severity == "critical"
    assert "Broken link" in issues[0].title


def test_canonical_check_changed():
    check = CanonicalCheck()
    current = {"url": "https://example.com/page", "canonical_url": "https://example.com/new-page", "status_code": 200}
    prev = {"url": "https://example.com/page", "canonical_url": "https://example.com/page", "status_code": 200}

    issues = check.analyze(current, prev)
    assert len(issues) == 1
    assert issues[0].severity == "critical"
    assert "Canonical target URL changed" in issues[0].title


def test_metadata_noindex_detected():
    check = MetadataCheck()
    current = {"url": "https://example.com/page", "robots_meta": "noindex, follow", "title": "Page Title", "status_code": 200}
    prev = {"url": "https://example.com/page", "robots_meta": "index, follow", "title": "Page Title", "status_code": 200}

    issues = check.analyze(current, prev)
    assert any(i.severity == "critical" and "NOINDEX" in i.title for i in issues)


def test_missing_h1_check():
    check = MissingH1Check()
    current = {"url": "https://example.com/page", "h1_tags": [], "status_code": 200}
    issues = check.analyze(current)
    assert len(issues) == 1
    assert issues[0].severity == "notice"
    assert "Missing H1" in issues[0].title


def test_diff_engine_health_score():
    engine = DiffEngine()
    current_snaps = [
        {"url": "https://example.com/1", "status_code": 404, "h1_tags": []},
        {"url": "https://example.com/2", "status_code": 200, "canonical_url": "https://example.com/2", "title": "Valid Long Page Title Test", "description": "Valid long description over 50 chars for testing purposes", "h1_tags": ["Valid H1"]},
    ]
    prev_snaps = [
        {"url": "https://example.com/1", "status_code": 200, "h1_tags": ["Title 1"]},
        {"url": "https://example.com/2", "status_code": 200, "canonical_url": "https://example.com/2", "title": "Valid Long Page Title Test", "description": "Valid long description over 50 chars for testing purposes", "h1_tags": ["Valid H1"]},
    ]

    issues, _, score = engine.compare_snapshots(current_snaps, prev_snaps)
    assert score < 100
    assert any(i.severity == "critical" for i in issues)
