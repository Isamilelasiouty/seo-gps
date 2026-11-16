"""
Generative Engine Optimization (GEO) & AI Search Readiness Audit Engine.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List
import re


def audit_geo_readiness(
    html: str,
    robots_txt: str = "",
    schemas: List[str] = None,
    word_count: int = 0
) -> Dict[str, Any]:
    """
    Evaluates how easily an AI search engine (Perplexity, ChatGPT, Google AI Overviews)
    can extract, cite, and reference content from this page.
    """
    schemas = schemas or []
    score = 100
    breakdown = []

    # 1. Robots.txt Access for AI Bots (25 pts)
    ai_blocked = []
    if robots_txt:
        for bot in ["GPTBot", "ClaudeBot", "PerplexityBot"]:
            pattern = rf"user-agent:\s*{bot}\s+disallow:\s*/"
            if re.search(pattern, robots_txt, re.I):
                ai_blocked.append(bot)

    if ai_blocked:
        score -= 25
        breakdown.append({
            "dimension": "إمكانية وصول عناكب الذكاء الاصطناعي (AI Crawler Access)",
            "status": "warning",
            "score_impact": -25,
            "details": f"عناكب محركات البحث الذكية ({', '.join(ai_blocked)}) محظورة من الزحف في robots.txt.",
            "recommendation": "قم بالسماح لعناكب الذكاء الاصطناعي الرئيسية لتأهيل موقعك للاقتباس في الإجابات التوليدية."
        })
    else:
        breakdown.append({
            "dimension": "إمكانية وصول عناكب الذكاء الاصطناعي (AI Crawler Access)",
            "status": "passed",
            "score_impact": 0,
            "details": "عناكب الذكاء الاصطناعي غير محظورة ويمكنها قراءة المحتوى وفهرسته.",
            "recommendation": "ممتاز."
        })

    # 2. Structured Facts & Tables (25 pts)
    has_tables = "<table" in html.lower()
    has_lists = "<ul" in html.lower() or "<ol" in html.lower()
    has_qa = bool(re.search(r"<h[2-4][^>]*>[^<]*\?[^<]*</h[2-4]>", html, re.I))

    fact_density = 0
    if has_tables: fact_density += 10
    if has_lists: fact_density += 8
    if has_qa: fact_density += 7

    if fact_density < 10:
        score -= 20
        breakdown.append({
            "dimension": "كثافة الحقائق والجداول (Fact & Quotability Density)",
            "status": "warning",
            "score_impact": -20,
            "details": "المحتوى يفتقر للجداول والقوائم النقطية وفقرات الأسئلة والأجوبة السريعة التي تفضلها نماذج LLM للاقتباس المباشر.",
            "recommendation": "أضف جداول مقارنة، ونقاط تعداد، وصيغ أسئلة وإجابات مباشرة وموجزة في بداية كل فقرة."
        })
    else:
        breakdown.append({
            "dimension": "كثافة الحقائق والجداول (Fact & Quotability Density)",
            "status": "passed",
            "score_impact": 0,
            "details": "الصفحة غنية بالقوائم والجداول والفقرات المنظمة التي يسهل على الذكاء الاصطناعي استخلاصها.",
            "recommendation": "حافظ على هذا الهيكل المنظم."
        })

    # 3. Structured Data Authority (25 pts)
    high_value_schemas = {"FAQPage", "Article", "Product", "Organization", "LocalBusiness", "MedicalWebPage"}
    found_high_value = set(schemas).intersection(high_value_schemas)
    if not found_high_value:
        score -= 20
        breakdown.append({
            "dimension": "البيانات المنظمة للكيانات (Entity Structured Data)",
            "status": "warning",
            "score_impact": -20,
            "details": "لم يتم رصد Schema متقدمة للكيانات (مثل FAQPage أو Article أو Product) لربط الصفحة بكيانات محرك البحث الدلالي.",
            "recommendation": "أضف Schema JSON-LD لتحديد المؤلف، الكيان، والأسئلة الشائعة لتسهيل ربط المعرفة في الـ Knowledge Graph."
        })
    else:
        breakdown.append({
            "dimension": "البيانات المنظمة للكيانات (Entity Structured Data)",
            "status": "passed",
            "score_impact": 0,
            "details": f"تم تفعيل بيانات منظمة موثوقة: {', '.join(found_high_value)}.",
            "recommendation": "ممتاز."
        })

    # 4. Author & EEAT Credibility (25 pts)
    has_author = bool(re.search(r'(rel=["\']author["\']|itemprop=["\']author["\']|"author":|meta\s+name=["\']author["\'])', html, re.I))
    has_dates = bool(re.search(r'(datePublished|dateModified|pubdate|published_time)', html, re.I))

    if not has_author and not has_dates:
        score -= 15
        breakdown.append({
            "dimension": "إشارات الخبرة والموثوقية (EEAT & Authority)",
            "status": "warning",
            "score_impact": -15,
            "details": "غياب اسم المؤلف وتاريخ النشر/التحديث البرمجي، وهو ما يخفض ثقة خوارزميات الاستشهاد التوليدية.",
            "recommendation": "أضف وسم مؤلف واضح وتاريخ آخر تحديث في رأس المقال وفي كود الـ Schema."
        })
    else:
        breakdown.append({
            "dimension": "إشارات الخبرة والموثوقية (EEAT & Authority)",
            "status": "passed",
            "score_impact": 0,
            "details": "تتوفر إشارات واضحة لبيانات المؤلف وتواريخ التحديث والاعتماد.",
            "recommendation": "ممتاز."
        })

    final_score = max(0, min(100, score))
    return {
        "geo_score": final_score,
        "readiness_level": "جاهز ومثالي للاقتباس" if final_score >= 80 else ("متوسط الجاهزية" if final_score >= 50 else "ضعيف الجاهزية"),
        "breakdown": breakdown,
    }
