"""
Custom Extraction Engine (CSS Selector, XPath, and Regex).
Allows users to extract specific data from crawled pages (Prices, SKUs, Authors, Dates, Custom Meta).
Author: Ismail El Asiouty
"""
import re
from typing import Dict, Any, List, Optional
from html.parser import HTMLParser


class SimpleDOMExtractor(HTMLParser):
    """Lightweight DOM extractor supporting class, id, tag, and attribute matching."""
    def __init__(self):
        super().__init__()
        self.tags = []
        self.text_content = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        self.tags.append({"tag": tag, "attrs": attr_dict, "text": ""})

    def handle_data(self, data):
        if self.tags:
            self.tags[-1]["text"] += data


def extract_regex(pattern: str, html: str, group: int = 1) -> List[str]:
    """Extracts data via regular expressions."""
    try:
        matches = re.finditer(pattern, html, re.IGNORECASE | re.DOTALL)
        results = []
        for m in matches:
            if group <= len(m.groups()):
                results.append(m.group(group).strip())
            else:
                results.append(m.group(0).strip())
        return results
    except Exception:
        return []


def extract_css_selector_simple(selector: str, html: str) -> List[str]:
    """
    Evaluates CSS selectors on raw HTML.
    Supports:
    - .class_name
    - #id_name
    - tag_name (e.g. h1, p, span)
    - tag.class_name
    - tag[attr="val"]
    - meta[name="..."]
    """
    results = []
    sel = selector.strip()
    
    # Check meta tags
    meta_match = re.search(r'meta\[(name|property)=["\']([^"\']+)["\']\]', sel, re.I)
    if meta_match:
        attr_name = meta_match.group(1)
        attr_val = meta_match.group(2)
        pattern = rf'<meta\s+[^>]*{attr_name}=["\']{re.escape(attr_val)}["\'][^>]*content=["\']([^"\']*)["\']'
        m = re.findall(pattern, html, re.I)
        return m

    # Tag by ID: #product-price or div#product-price
    id_match = re.search(r'#([a-zA-Z0-9_-]+)', sel)
    if id_match:
        target_id = id_match.group(1)
        pattern = rf'<[^>]+id=["\']{re.escape(target_id)}["\'][^>]*>(.*?)</'
        m = re.findall(pattern, html, re.I | re.DOTALL)
        cleaned = [re.sub(r'<[^>]+>', '', item).strip() for item in m]
        return [c for c in cleaned if c]

    # Tag by Class: .price or span.price
    class_match = re.search(r'\.([a-zA-Z0-9_-]+)', sel)
    if class_match:
        target_class = class_match.group(1)
        pattern = rf'<[^>]+class=["\'][^"\']*\b{re.escape(target_class)}\b[^"\']*["\'][^>]*>(.*?)</'
        m = re.findall(pattern, html, re.I | re.DOTALL)
        cleaned = [re.sub(r'<[^>]+>', '', item).strip() for item in m]
        return [c for c in cleaned if c]

    # Bare tag: h1, h2, title, blockquote
    tag_match = re.match(r'^([a-zA-Z0-9]+)$', sel)
    if tag_match:
        tag_name = tag_match.group(1)
        pattern = rf'<{tag_name}[^>]*>(.*?)</{tag_name}>'
        m = re.findall(pattern, html, re.I | re.DOTALL)
        cleaned = [re.sub(r'<[^>]+>', '', item).strip() for item in m]
        return [c for c in cleaned if c]

    return results


class CustomExtractionEngine:
    def __init__(self, rules: Optional[List[Dict[str, Any]]] = None):
        """
        rules format:
        [
            {"name": "Price", "type": "css", "target": ".price"},
            {"name": "SKU", "type": "regex", "target": r'"sku":\\s*"([^"]+)"'},
            {"name": "Author", "type": "css", "target": "meta[name=\\"author\\"]"}
        ]
        """
        self.rules = rules or []

    def execute(self, html: str) -> Dict[str, List[str]]:
        extracted = {}
        if not html or not self.rules:
            return extracted

        for rule in self.rules:
            rule_name = rule.get("name", "extraction")
            rule_type = rule.get("type", "css").lower()
            target = rule.get("target", "")

            if not target:
                continue

            if rule_type == "regex":
                extracted[rule_name] = extract_regex(target, html)
            elif rule_type in ("css", "xpath"):
                extracted[rule_name] = extract_css_selector_simple(target, html)
            else:
                extracted[rule_name] = []

        return extracted
