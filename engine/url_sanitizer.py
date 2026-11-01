"""
Smart URL Sanitizer, Slug Recovery Engine, and Redirect Rule Generator for SEO GPS.
Author: Ismail El Asiouty
"""
import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse, unquote, quote
import rapidfuzz.fuzz as fuzz

# Zero-width, bidi, and invisible control characters
INVISIBLE_CHARS_REGEX = re.compile(
    r"[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069\u00A0\r\n]"
)


def sanitize_url(raw_url: str) -> Tuple[str, List[str]]:
    """
    Applies the Smart URL Sanitizer:
    1. Trims leading/trailing whitespace, %20, \\xa0, zero-width and bidi control characters.
    2. Collapses accidental double slashes in path.
    3. Normalizes percent-encoding case.
    4. Unicode NFC normalization for Arabic.
    5. Strips accidental linebreaks.
    Returns: (cleaned_url, list_of_defects_found)
    """
    if not raw_url:
        return "", []

    defects: List[str] = []
    original = raw_url

    # Check for leading/trailing %20 or whitespace
    s = raw_url.strip()
    if s != raw_url:
        defects.append("whitespace_padding")

    while s.startswith("%20") or s.startswith("%20") or s.startswith("&nbsp;"):
        s = s[3:].strip()
        if "leading_%20" not in defects:
            defects.append("leading_%20")

    while s.endswith("%20"):
        s = s[:-3].strip()
        if "trailing_%20" not in defects:
            defects.append("trailing_%20")

    # Remove invisible/zero-width/bidi control characters and linebreaks
    cleaned_chars = INVISIBLE_CHARS_REGEX.sub("", s)
    if cleaned_chars != s:
        defects.append("invisible_or_bidi_characters")
    s = cleaned_chars

    # Unicode NFC normalization for Arabic
    normalized_nfc = unicodedata.normalize("NFC", s)
    if normalized_nfc != s:
        defects.append("unicode_nfc_normalization")
    s = normalized_nfc

    # Parse and fix path
    try:
        parsed = urlparse(s)
        path = parsed.path
        if "//" in path:
            defects.append("double_slash_in_path")
            while "//" in path:
                path = path.replace("//", "/")

        # Strip %20 or whitespace in path segments
        if "/%20" in path or "/ " in path:
            defects.append("leading_whitespace")
            path = path.replace("/%20", "/").replace("/ ", "/")

        if path.endswith("%20") or path.endswith(" "):
            defects.append("trailing_whitespace")
            path = path[:-3] if path.endswith("%20") else path[:-1]

        # Uppercase percent-encodings (e.g. %d8 -> %D8)
        norm_query = re.sub(r"%[0-9a-fA-F]{2}", lambda m: m.group(0).upper(), parsed.query)
        norm_path = re.sub(r"%[0-9a-fA-F]{2}", lambda m: m.group(0).upper(), path)

        s = urlunparse((parsed.scheme, parsed.netloc, norm_path, parsed.params, norm_query, ""))
    except Exception:
        pass

    return s, defects


def extract_slug(url: str) -> str:
    """Extract and decode path slug from URL."""
    try:
        parsed = urlparse(url)
        path = parsed.path.rstrip("/")
        if not path:
            return ""
        segment = path.split("/")[-1]
        decoded = unquote(segment)
        # NFC normalize
        return unicodedata.normalize("NFC", decoded.lower())
    except Exception:
        return ""


def recover_slug(
    broken_url: str,
    healthy_urls: List[str],
    min_confidence: float = 0.60
) -> Optional[Dict[str, Any]]:
    """
    Slug Recovery Engine for remaining 404s:
    Decodes the Arabic/UTF-8 slug, compares with slugs of known healthy pages
    using rapidfuzz + prefix/truncation detection.
    """
    broken_slug = extract_slug(broken_url)
    if not broken_slug or len(broken_slug) < 3 or not healthy_urls:
        return None

    best_match = None
    best_score = 0.0
    best_reason = ""

    for target_url in healthy_urls:
        target_slug = extract_slug(target_url)
        if not target_slug or target_slug == broken_slug:
            continue

        # 1. Prefix / Truncation check
        if target_slug.startswith(broken_slug) and len(broken_slug) >= 4:
            missing_len = len(target_slug) - len(broken_slug)
            score = max(0.70, 1.0 - (missing_len * 0.04))
            reason = f"Truncated slug (missing {missing_len} characters at end)"
        elif broken_slug.startswith(target_slug) and len(target_slug) >= 4:
            extra_len = len(broken_slug) - len(target_slug)
            score = max(0.65, 1.0 - (extra_len * 0.05))
            reason = f"Extra trailing characters ({extra_len} characters appended)"
        else:
            # 2. Levenshtein ratio via rapidfuzz
            ratio = fuzz.ratio(broken_slug, target_slug) / 100.0
            score = ratio
            reason = f"Fuzzy slug similarity ({int(ratio * 100)}% match)"

        if score > best_score:
            best_score = score
            best_match = target_url
            best_reason = reason

    if best_match and best_score >= min_confidence:
        confidence_level = "high" if best_score >= 0.85 else ("medium" if best_score >= 0.70 else "low")
        target_s = extract_slug(best_match)
        return {
            "suggested_url": best_match,
            "confidence_score": round(best_score, 2),
            "confidence": round(best_score, 2),
            "confidence_level": confidence_level,
            "reason": best_reason,
            "broken_slug": broken_slug,
            "target_slug": target_s,
            "matched_slug": target_s,
        }

    return None


def match_dead_page_redirect(
    dead_url: str,
    healthy_pages: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Dead Page Redirect Matcher:
    For true 404/410 pages that stay dead, suggest the closest active page
    by slug + title similarity.
    """
    if not healthy_pages:
        return None

    dead_slug = extract_slug(dead_url)
    best_candidate = None
    best_score = 0.0

    for page in healthy_pages:
        active_url = page.get("url", "")
        if not active_url:
            continue
        active_slug = extract_slug(active_url)
        active_title = page.get("title", "")

        slug_sim = fuzz.ratio(dead_slug, active_slug) / 100.0 if dead_slug and active_slug else 0.0
        # Check title similarity with slug words
        title_sim = 0.0
        if dead_slug and active_title:
            slug_words = dead_slug.replace("-", " ").replace("_", " ")
            title_sim = fuzz.partial_ratio(slug_words, active_title.lower()) / 100.0

        combined_score = (slug_sim * 0.7) + (title_sim * 0.3)
        if combined_score > best_score:
            best_score = combined_score
            best_candidate = {
                "suggested_url": active_url,
                "score": round(combined_score, 2),
                "title": active_title,
                "confidence": "high" if combined_score >= 0.80 else ("medium" if combined_score >= 0.50 else "low")
            }

    if best_candidate and best_candidate["score"] >= 0.35:
        return best_candidate
    return None


def is_soft_404(status_code: int, title: str, h1: str, body_text: str) -> Tuple[bool, str]:
    """
    Soft 404 detection:
    200 responses that are actually error pages (template phrases in Arabic/English, tiny content).
    """
    if status_code != 200:
        return False, ""

    text_sample = f"{title} {h1} {body_text[:1500]}".lower()

    # English patterns
    en_error_phrases = [
        "page not found", "404 not found", "error 404", "does not exist",
        "nothing found", "page cannot be found", "we couldn't find that page"
    ]
    for phrase in en_error_phrases:
        if phrase in text_sample:
            return True, f"Error page phrase detected in content: '{phrase}'"

    # Arabic patterns
    ar_error_phrases = [
        "الصفحة غير موجودة", "لم يتم العثور على الصفحة", "خطأ 404",
        "عذراً، الصفحة التي تبحث عنها غير متوفرة", "لا توجد نتائج", "المحتوى غير متوفر"
    ]
    for phrase in ar_error_phrases:
        if phrase in text_sample:
            return True, f"عبارة صفحة خطأ مكتشفة في المحتوى: '{phrase}'"

    # Minimal content with error title
    word_count = len(body_text.split())
    if word_count < 40 and ("404" in title or "error" in title.lower() or "خطأ" in title):
        return True, f"Thin content ({word_count} words) with error indicator in title"

    return False, ""


def generate_redirect_rules(
    source_url: str,
    target_url: str,
    code: int = 301
) -> Dict[str, str]:
    """
    Generates syntactically valid Nginx and Apache (.htaccess) redirect rules,
    properly escaping Arabic and special characters.
    """
    try:
        parsed_src = urlparse(source_url)
        parsed_dst = urlparse(target_url)

        src_path = parsed_src.path or "/"
        # For Nginx: escape regex specials
        escaped_src_nginx = re.escape(src_path)
        # Handle Arabic encoding safely: percent-encode or raw
        encoded_src = quote(src_path, safe="/:?=&")
        encoded_dst = quote(target_url, safe="/:?=&@+$,#")

        # Nginx syntax: rewrite ^/old-path$ https://example.com/new-path permanent;
        nginx_rule = f"rewrite ^{escaped_src_nginx}$ {encoded_dst} permanent;"

        # Apache (.htaccess) syntax: Redirect 301 /old-path https://example.com/new-path
        # or RewriteRule ^old-path/?$ https://example.com/new-path [R=301,L]
        stripped_src_htaccess = src_path.lstrip("/")
        escaped_src_htaccess = re.escape(stripped_src_htaccess)
        htaccess_rule = (
            f"# Collapse chain/redirect rule\n"
            f"RewriteRule ^{escaped_src_htaccess}/?$ {encoded_dst} [R={code},L]"
        )

        return {
            "nginx": nginx_rule,
            "htaccess": htaccess_rule,
            "source_path": src_path,
            "target_url": target_url,
            "status_code": code,
        }
    except Exception as e:
        return {
            "nginx": f"# Error generating Nginx rule: {e}",
            "htaccess": f"# Error generating .htaccess rule: {e}",
            "source_path": source_url,
            "target_url": target_url,
            "status_code": code,
        }
