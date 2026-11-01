"""
Content, Taxonomy, Freshness, Schema Gaps, and Action Plan Analyzers for SEO GPS.
Author: Ismail El Asiouty
"""
import re
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple


# Default CTR triggering keywords
DEFAULT_CTR_KEYWORDS = [
    # English
    "fees", "admission", "requirements", "steps", "guide", "pricing", "cost", "deadlines", "how to", "best", "top",
    # Arabic
    "شروط", "رسوم", "خطوات", "مصاريف", "دليل", "متطلبات", "مواعيد", "كيفية", "أفضل", "تكلفة", "طريقة"
]

# Outdated years pattern (matches 2018 through 2026)
OUTDATED_YEAR_REGEX = re.compile(r"\b(201[89]|202[0-6])\b")


def scan_outdated_years(
    text: str,
    target_year: int = 2027,
    field_name: str = "title"
) -> List[Dict[str, Any]]:
    """
    Year Pattern Scanner:
    Finds outdated years in text and suggests exact replacement.
    """
    if not text:
        return []

    findings = []
    for match in OUTDATED_YEAR_REGEX.finditer(text):
        old_year = match.group(1)
        start, end = match.span()
        suggested = text[:start] + str(target_year) + text[end:]
        findings.append({
            "field": field_name,
            "detected_year": old_year,
            "target_year": int(target_year),
            "original_snippet": text[max(0, start - 20):min(len(text), end + 20)],
            "suggested_text": suggested,
        })
    return findings


def analyze_title_meta_quality(
    title: str,
    description: str,
    h1: str,
    ctr_keywords: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyzes title and meta description lengths, missing fields, and CTR trigger keywords.
    """
    keywords = ctr_keywords or DEFAULT_CTR_KEYWORDS
    issues = []
    title_len = len(title)
    desc_len = len(description)

    # Title checks
    if not title:
        issues.append({
            "type": "missing_title",
            "severity": "critical",
            "message": "Missing <title> tag entirely",
        })
    elif title_len < 30:
        issues.append({
            "type": "short_title",
            "severity": "notice",
            "message": f"Title tag is short ({title_len} chars); ideal length is 35-65 chars",
        })
    elif title_len > 65:
        issues.append({
            "type": "long_title",
            "severity": "notice",
            "message": f"Title tag is long ({title_len} chars) and may truncate on mobile SERPs",
        })

    # Meta description checks
    if not description:
        issues.append({
            "type": "missing_description",
            "severity": "warning",
            "message": "Missing meta description; search engines will auto-generate snippet",
        })
    elif desc_len < 70:
        issues.append({
            "type": "short_description",
            "severity": "notice",
            "message": f"Meta description is short ({desc_len} chars); ideal is 120-160 chars",
        })
    elif desc_len > 165:
        issues.append({
            "type": "long_description",
            "severity": "notice",
            "message": f"Meta description exceeds SERP snippet limit ({desc_len} chars)",
        })

    # CTR Triggers check (checks if title or description contains high-converting intent keywords)
    combined_text = f"{title} {description} {h1}".lower()
    has_ctr_trigger = any(kw.lower() in combined_text for kw in keywords) or any(c.isdigit() for c in title)

    return {
        "title_length": title_len,
        "desc_length": desc_len,
        "has_ctr_triggers": has_ctr_trigger,
        "issues": issues,
    }


def classify_url_taxonomy(
    url: str,
    title: str,
    h1: str,
    taxonomy_rules: Optional[Dict[str, List[str]]] = None
) -> str:
    """
    Taxonomy Classifier:
    Classifies URL into guides_and_fees, blog_guide, landing_page, listing, or other
    using path rules and on-page signals.
    """
    rules = taxonomy_rules or {
        "guides_and_fees": ["/guide", "/fees", "/admission", "/requirements", "/programs", "/courses", "/tuition"],
        "blog_guide": ["/blog", "/article", "/news", "/post", "/read"],
        "landing_page": ["/landing", "/start", "/apply", "/register", "/signup"],
        "listing": ["/category", "/programs-list", "/all-", "/catalog", "/archive"],
    }

    url_lower = url.lower()
    title_lower = title.lower()

    for pattern in rules.get("guides_and_fees", []):
        if pattern in url_lower:
            return "guides_and_fees"

    for pattern in rules.get("blog_guide", []):
        if pattern in url_lower:
            return "blog_guide"

    for pattern in rules.get("landing_page", []):
        if pattern in url_lower:
            return "landing_page"

    for pattern in rules.get("listing", []):
        if pattern in url_lower:
            return "listing"

    # Secondary heuristic from Title / H1
    if any(k in title_lower for k in ["شروط", "رسوم", "مصاريف", "fees", "admission", "requirements"]):
        return "guides_and_fees"
    if any(k in title_lower for k in ["دليل", "guide", "how to"]):
        return "blog_guide"

    return "other"


def extract_real_faq_items(html_body: str) -> List[Dict[str, str]]:
    """
    Extracts real Q&A pairs from HTML headings/summaries ending in ? or ؟
    Strict rule: Never invent questions or answers.
    """
    faq_items = []
    # Regex to capture headings (h2, h3, h4, dt, summary) ending with a question mark
    question_regex = re.compile(
        r"<(h[2-4]|dt|summary)[^>]*>(.*?[?؟])\s*</\1>\s*(?:<p[^>]*>(.*?)</p>|<div[^>]*>(.*?)</div>)",
        re.IGNORECASE | re.DOTALL
    )

    for match in question_regex.finditer(html_body):
        raw_q = match.group(2)
        raw_a = match.group(3) or match.group(4) or ""
        # Strip internal tags
        clean_q = re.sub(r"<[^>]+>", "", raw_q).strip()
        clean_a = re.sub(r"<[^>]+>", "", raw_a).strip()
        if len(clean_q) >= 8 and len(clean_a) >= 15:
            faq_items.append({
                "question": clean_q,
                "answer": clean_a,
            })
            if len(faq_items) >= 10:
                break

    return faq_items


def generate_faq_json_ld(faq_items: List[Dict[str, str]]) -> str:
    """
    Generates valid, syntax-checked JSON-LD for FAQPage from real extracted items.
    """
    if not faq_items:
        return ""

    schema_dict = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["question"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item["answer"],
                }
            }
            for item in faq_items
        ]
    }
    return json.dumps(schema_dict, indent=2, ensure_ascii=False)


def analyze_structured_data_gaps(
    page_type: str,
    schema_types: List[str],
    html_body: str,
    date_modified: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Identifies structured data gaps according to detected page type.
    """
    gaps = []
    faq_code = None

    # Check 1: Real FAQ items exist on page but FAQPage schema is missing
    real_faqs = extract_real_faq_items(html_body)
    if real_faqs and "FAQPage" not in schema_types:
        faq_code = generate_faq_json_ld(real_faqs)
        gaps.append({
            "type": "missing_faq_schema",
            "severity": "warning",
            "message": f"Discovered {len(real_faqs)} real Q&A items on page without FAQPage JSON-LD schema",
            "faq_count": len(real_faqs),
            "generated_json_ld": faq_code,
        })

    # Check 2: Guides/Academic without EducationalOrganization or Course
    if page_type == "guides_and_fees":
        if not any(t in schema_types for t in ["EducationalOrganization", "Course", "CollegeOrUniversity", "School"]):
            gaps.append({
                "type": "missing_educational_schema",
                "severity": "notice",
                "message": "Program/Guide page lacks EducationalOrganization or Course structured data",
            })

    # Check 3: Blog/Articles missing dateModified
    if page_type == "blog_guide" and "Article" in schema_types and not date_modified:
        gaps.append({
            "type": "missing_date_modified",
            "severity": "notice",
            "message": "Article schema is missing dateModified property for Google Freshness tracking",
        })

    return gaps, faq_code


def build_deterministic_action_plan(
    url: str,
    page_type: str,
    issues: List[Dict[str, Any]],
    target_year: int = 2027
) -> Dict[str, Any]:
    """
    Generates a single, clear, deterministic action plan sentence combining all diagnosed issues.
    Templates in English and Arabic.
    """
    actions_en = []
    actions_ar = []
    impact_score = 3
    ease_score = 5

    has_404 = any(i.get("status_code") == 404 or "404" in str(i) for i in issues)
    has_redirect = any(i.get("status_code") == 301 or "redirect" in str(i).lower() for i in issues)
    has_outdated_year = any("year" in str(i).lower() for i in issues)
    has_noindex = any("noindex" in str(i).lower() for i in issues)
    has_missing_title = any("missing_title" in str(i) for i in issues)
    has_missing_faq = any("missing_faq" in str(i) for i in issues)
    has_thin = any("thin" in str(i).lower() for i in issues)

    if has_noindex:
        actions_en.append("Remove accidental noindex tag to restore search indexation")
        actions_ar.append("إزالة وسم noindex لإعادة الصفحة إلى نتائج البحث")
        impact_score += 4
        ease_score += 4

    if has_404:
        actions_en.append("Resolve 404 error with a 301 redirect to the closest active equivalent page")
        actions_ar.append("معالجة خطأ 404 بعمل تحويل 301 إلى الصفحة البديلة الأنسب")
        impact_score += 4
        ease_score += 3

    if has_outdated_year:
        actions_en.append(f"Update outdated year references to {target_year}")
        actions_ar.append(f"تحديث السنوات القديمة إلى {target_year}")
        impact_score += 2
        ease_score += 4

    if has_missing_faq:
        actions_en.append("Add FAQPage JSON-LD schema using the pre-generated snippet from page Q&A")
        actions_ar.append("إضافة كود FAQPage الجاهز للأسئلة الشائعة الموجودة بالصفحة")
        impact_score += 2
        ease_score += 3

    if has_missing_title:
        actions_en.append("Write a descriptive 50-character title tag with primary intent keyword")
        actions_ar.append("كتابة عنوان رئيسي مناسب بطول 50 حرفاً يتضمن الكلمة المفتاحية")
        impact_score += 3
        ease_score += 4

    if has_thin:
        actions_en.append("Enrich content depth with detailed requirements and FAQs (>250 words)")
        actions_ar.append("إثراء المحتوى بمعلومات وشروط تفصيلية تتجاوز 250 كلمة")
        impact_score += 2
        ease_score += 2

    if not actions_en:
        if page_type == "guides_and_fees":
            actions_en.append(f"Verify fees/deadlines for {target_year} and ensure internal links from homepage")
            actions_ar.append(f"التأكد من تحديث الرسوم لعام {target_year} وإضافة روابط داخلية")
        else:
            actions_en.append("Monitor technical health and preserve existing canonical configuration")
            actions_ar.append("مراقبة الحالة التقنية والحفاظ على سلامة الرابط الأساسي")

    # Combine into single sentence
    action_sentence_en = ", and ".join(actions_en) + "."
    action_sentence_ar = "، و".join(actions_ar) + "."

    # Priority score: Impact (1-10) x Ease (1-10) normalized to 100
    priority_score = min(100, int((impact_score * ease_score) * 1.5))
    effort = "Low (15 min)" if ease_score >= 7 else ("Medium (1 hr)" if ease_score >= 4 else "High (3+ hrs)")
    effort_ar = "بسيط (15 دقيقة)" if ease_score >= 7 else ("متوسط (ساعة)" if ease_score >= 4 else "كبير (3+ ساعات)")

    return {
        "url": url,
        "page_type": page_type,
        "action_sentence_en": action_sentence_en,
        "action_sentence_ar": action_sentence_ar,
        "priority_score": priority_score,
        "effort": effort,
        "effort_ar": effort_ar,
        "impact": min(10, impact_score),
        "ease": min(10, ease_score),
    }
