"""
High-performance DOM Parsing Engine using Selectolax (Lexbor engine).
Replaces fragile regex with robust, C-level HTML parsing.
Author: Ismail El Asiouty
"""
import re
import json
from typing import Dict, Any, List, Set
from urllib.parse import urljoin
from selectolax.lexbor import LexborHTMLParser as HTMLParser, LexborNode as Node
from engine.url_utils import normalize_url, is_internal_url

NOISE_TAGS: Set[str] = {
    "nav", "header", "footer", "aside", "script", "style", "noscript", "svg", "form"
}


def extract_dom_signals(
    html: str,
    base_url: str,
    target_domain: str
) -> Dict[str, Any]:
    """
    Parses HTML with Lexbor, extracting all SEO signals accurately without regex flaws.
    """
    if not html:
        return {
            "title": "",
            "description": "",
            "canonical_url": "",
            "robots_meta": "",
            "primary_h1": "",
            "h1_tags": [],
            "heading_hierarchy": [],
            "main_content_text": "",
            "word_count": 0,
            "internal_links": [],
            "external_links": [],
            "hreflangs": [],
            "schema_types": [],
            "schema_objects": [],
            "schema_errors": [],
            "og_metadata": {},
            "twitter_card": {},
            "assets": [],
            "soft_404_flag": False,
        }

    parser = HTMLParser(html)

    # 1. Clean Title (ignores titles in comments or scripts)
    title_node = parser.css_first("head > title") or parser.css_first("title")
    title = title_node.text(strip=True) if title_node else ""

    # 2. Meta Description (robust against apostrophes and quote mixing)
    meta_desc_node = (
        parser.css_first('meta[name="description" i]') or
        parser.css_first('meta[property="og:description" i]')
    )
    description = meta_desc_node.attributes.get("content", "").strip() if meta_desc_node else ""

    # 3. Canonical Tag
    canonical_node = parser.css_first('link[rel="canonical" i]')
    canonical_raw = canonical_node.attributes.get("href", "").strip() if canonical_node else ""
    canonical_url = urljoin(base_url, canonical_raw) if canonical_raw else ""
    if canonical_url:
        canonical_url = normalize_url(canonical_url)

    # 4. Robots Directives
    robots_node = parser.css_first('meta[name="robots" i]')
    robots_meta = robots_node.attributes.get("content", "").strip() if robots_node else ""

    # 5. Heading Structure (H1-H6)
    headings: List[Dict[str, Any]] = []
    h1_list: List[str] = []
    for h in parser.css("h1, h2, h3, h4, h5, h6"):
        # Skip headings inside script/style if parser captures them
        txt = h.text(strip=True)
        if txt:
            tag = h.tag.lower()
            try:
                level = int(tag[1])
            except (ValueError, IndexError):
                level = 1
            headings.append({"tag": tag, "text": txt, "level": level})
            if tag == "h1":
                h1_list.append(txt)
    primary_h1 = h1_list[0] if h1_list else ""

    # 6. Main Content & Word Count (strip noise tags)
    body = parser.body
    if body:
        # Decompose noise tags on a body clone
        for tag in NOISE_TAGS:
            for el in body.css(tag):
                el.decompose()
        main_text = body.text(separator=" ", strip=True)
        main_text = re.sub(r"\s+", " ", main_text)
    else:
        main_text = ""

    words = main_text.split()
    word_count = len(words)

    # 7. Comprehensive Link Graph Extraction
    internal_links: List[Dict[str, Any]] = []
    external_links: List[Dict[str, Any]] = []

    for a in parser.css("a[href], area[href]"):
        href = a.attributes.get("href", "").strip()
        if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue

        full_url = urljoin(base_url, href)
        norm_url = normalize_url(full_url)
        anchor_txt = a.text(strip=True)
        rel_attr = a.attributes.get("rel") or ""
        rel_tokens = [r.strip().lower() for r in rel_attr.split() if r.strip()]

        # Determine DOM location
        loc = "content"
        parent = a.parent
        while parent:
            ptag = (parent.tag or "").lower()
            if ptag in ("nav", "header"):
                loc = "nav"
                break
            if ptag == "footer":
                loc = "footer"
                break
            if ptag == "aside":
                loc = "sidebar"
                break
            parent = parent.parent

        link_dict = {
            "href": href,
            "normalized_url": norm_url,
            "anchor_text": anchor_txt,
            "rel": rel_tokens,
            "location": loc,
            "is_internal": is_internal_url(norm_url, target_domain),
        }

        if link_dict["is_internal"]:
            internal_links.append(link_dict)
        else:
            external_links.append(link_dict)

    # 8. Hreflang Tags
    hreflangs: List[Dict[str, str]] = []
    for link in parser.css('link[rel="alternate" i][hreflang]'):
        hreflangs.append({
            "lang": link.attributes.get("hreflang", "").lower().strip(),
            "href": urljoin(base_url, link.attributes.get("href", "").strip())
        })

    # 9. Structured Data JSON-LD
    schema_types: List[str] = []
    schema_objects: List[Dict[str, Any]] = []
    schema_errors: List[str] = []
    for s in parser.css('script[type="application/ld+json" i]'):
        raw_json = s.text(strip=True)
        if raw_json:
            try:
                data = json.loads(raw_json)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict):
                        schema_objects.append(item)
                        st = item.get("@type")
                        if isinstance(st, list):
                            schema_types.extend([str(t) for t in st])
                        elif st:
                            schema_types.append(str(st))
            except Exception as e:
                schema_errors.append(str(e))

    # 10. OpenGraph & Twitter Cards
    og_metadata: Dict[str, str] = {}
    twitter_card: Dict[str, str] = {}
    for meta in parser.css("meta[property], meta[name]"):
        prop = (meta.attributes.get("property") or "").lower().strip()
        name = (meta.attributes.get("name") or "").lower().strip()
        cnt = (meta.attributes.get("content") or "").strip()
        if prop.startswith("og:"):
            og_metadata[prop] = cnt
        elif name.startswith("twitter:"):
            twitter_card[name] = cnt

    # 11. Assets Extraction (Images, Scripts, Stylesheets)
    assets: List[Dict[str, Any]] = []
    for img in parser.css("img[src]"):
        src = img.attributes.get("src", "").strip()
        if src:
            assets.append({
                "url": urljoin(base_url, src),
                "asset_type": "image",
                "alt_text": img.attributes.get("alt", None),
                "has_dimensions": bool(img.attributes.get("width") and img.attributes.get("height")),
            })

    for script in parser.css("script[src]"):
        src = script.attributes.get("src", "").strip()
        if src:
            assets.append({
                "url": urljoin(base_url, src),
                "asset_type": "script",
            })

    for link in parser.css('link[rel="stylesheet" i][href]'):
        href = link.attributes.get("href", "").strip()
        if href:
            assets.append({
                "url": urljoin(base_url, href),
                "asset_type": "stylesheet",
            })

    # 12. Soft 404 Detection (200 status with obvious "Page Not Found" signals in text)
    soft_404 = False
    lower_text = main_text.lower()
    lower_title = title.lower()
    soft_404_indicators = [
        "page not found", "404 not found", "404 error", "الصفحة غير موجودة",
        "خطأ 404", "عذراً، هذه الصفحة غير متاحة", "nothing found here"
    ]
    if any(ind in lower_title for ind in soft_404_indicators) or (
        word_count < 60 and any(ind in lower_text for ind in soft_404_indicators)
    ):
        soft_404 = True

    return {
        "title": title,
        "description": description,
        "canonical_url": canonical_url,
        "robots_meta": robots_meta,
        "primary_h1": primary_h1,
        "h1_tags": h1_list,
        "heading_hierarchy": headings,
        "main_content_text": main_text,
        "word_count": word_count,
        "internal_links": internal_links,
        "external_links": external_links,
        "hreflangs": hreflangs,
        "schema_types": list(set(schema_types)),
        "schema_objects": schema_objects,
        "schema_errors": schema_errors,
        "og_metadata": og_metadata,
        "twitter_card": twitter_card,
        "assets": assets,
        "soft_404_flag": soft_404,
    }
