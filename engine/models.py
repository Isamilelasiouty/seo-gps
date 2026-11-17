"""
Single Typed Contract between Crawler, Storage, Checks, and DiffEngine for SEO GPS.
Every check in engine/checks/ MUST read from this schema.
Author: Ismail El Asiouty
"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional


@dataclass
class LinkItem:
    href: str
    normalized_url: str
    anchor_text: str = ""
    is_internal: bool = True
    rel: List[str] = field(default_factory=list)  # nofollow, sponsored, ugc
    location: str = "content"  # nav, footer, content, sidebar

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AssetItem:
    url: str
    asset_type: str = "image"  # image, script, stylesheet, pdf, audio, video
    size_bytes: int = 0
    status_code: Optional[int] = None
    alt_text: Optional[str] = None
    has_dimensions: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class HreflangEntry:
    lang: str
    href: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RedirectHop:
    from_url: str
    to_url: str
    status_code: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PageSnapshot:
    """
    Immutable typed contract representing a fully audited page snapshot.
    Supports both attribute access (.url) and dict-like subscripting (['url'])
    for 100% backward compatibility with existing checks.
    """
    # URL & Identity
    url: str
    normalized_url: str = ""
    final_url: str = ""
    scan_id: str = ""
    project_id: str = ""
    source: str = "root"  # root, sitemap, internal_link, imported, redirect
    found_on: Optional[str] = None
    depth: int = 0

    # HTTP & Transport
    status_code: int = 0
    response_time_ms: int = 0
    page_size_bytes: int = 0
    content_type: str = "text/html"
    charset: str = "utf-8"
    compression: Optional[str] = None
    is_tls_valid: bool = True
    tls_error: Optional[str] = None
    redirect_chain: List[RedirectHop] = field(default_factory=list)

    # Directives & Indexability
    is_indexable: bool = True
    indexability_reasons: List[str] = field(default_factory=list)
    robots_meta: str = ""
    x_robots_tag: str = ""
    canonical_url: str = ""
    canonical_sources: List[str] = field(default_factory=list)  # html, header
    is_canonical_match: bool = True

    # Core Headings & Metadata
    title: str = ""
    title_length_chars: int = 0
    title_pixel_width: int = 0
    description: str = ""
    description_length_chars: int = 0
    description_pixel_width: int = 0
    primary_h1: str = ""
    h1_tags: List[str] = field(default_factory=list)
    heading_hierarchy: List[Dict[str, Any]] = field(default_factory=list)

    # Content & Readability
    main_content_text: str = ""
    main_content_hash: str = ""
    word_count: int = 0
    text_to_html_ratio: float = 0.0
    lang_attribute: str = ""
    viewport_meta: str = ""

    # Links & Assets
    inbound_links: List[str] = field(default_factory=list)
    outbound_internal_links: List[LinkItem] = field(default_factory=list)
    outbound_external_links: List[LinkItem] = field(default_factory=list)
    assets: List[AssetItem] = field(default_factory=list)
    hreflangs: List[HreflangEntry] = field(default_factory=list)

    # Structured Data & OpenGraph
    schema_types: List[str] = field(default_factory=list)
    schema_objects: List[Dict[str, Any]] = field(default_factory=list)
    schema_errors: List[str] = field(default_factory=list)
    og_metadata: Dict[str, str] = field(default_factory=dict)
    twitter_card: Dict[str, str] = field(default_factory=dict)

    # Defect & Diagnostics
    url_defects: List[str] = field(default_factory=list)
    sanitized_target: Optional[str] = None
    soft_404_flag: bool = False
    requires_rendering: bool = False
    is_crawled: bool = True

    def __post_init__(self):
        if not self.normalized_url:
            self.normalized_url = self.url
        if not self.final_url:
            self.final_url = self.url
        if self.title and not self.title_length_chars:
            self.title_length_chars = len(self.title)
        if self.description and not self.description_length_chars:
            self.description_length_chars = len(self.description)
        if self.primary_h1 and not self.h1_tags:
            self.h1_tags = [self.primary_h1]
        elif self.h1_tags and not self.primary_h1:
            self.primary_h1 = self.h1_tags[0]

    def __getitem__(self, key: str) -> Any:
        # Compatibility aliases for legacy checks
        if key == "defects":
            return self.url_defects
        if key == "corrected_url":
            return self.sanitized_target
        if key == "inlinks":
            return self.inbound_links
        if key == "body_text" or key == "text_sample":
            return self.main_content_text
        if key == "canonical":
            return self.canonical_url
        if key == "h1":
            return self.primary_h1
        if key == "robots":
            return self.robots_meta
        if key == "crawl_depth":
            return self.depth
        if key == "is_soft_404" or key == "soft_404_evidence":
            return self.soft_404_flag
        if key == "schema_items":
            return self.schema_objects
        if key in ("slug_recovery", "dead_page_match"):
            return {}
        if key == "raw_html":
            return ""
        if hasattr(self, key):
            return getattr(self, key)
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except (KeyError, AttributeError):
            return default

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key) or key in (
            "defects", "corrected_url", "inlinks", "body_text", "text_sample",
            "canonical", "h1", "robots", "crawl_depth", "is_soft_404",
            "soft_404_evidence", "schema_items", "slug_recovery", "dead_page_match", "raw_html"
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # Ensure backward compatibility aliases exist in dictionary export
        d["canonical"] = self.canonical_url
        d["h1"] = self.primary_h1
        d["body_text"] = self.main_content_text
        d["text_sample"] = self.main_content_text[:2000]
        d["defects"] = self.url_defects
        d["corrected_url"] = self.sanitized_target
        d["inlinks"] = self.inbound_links
        d["is_soft_404"] = self.soft_404_flag
        return d
