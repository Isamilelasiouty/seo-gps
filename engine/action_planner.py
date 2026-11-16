"""
Framework-Aware Action Plan & Code Patch Generator for SEO GPS.
Transforms raw technical issues into prioritized, framework-specific action plans with ready-to-copy code patches.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
import re


def detect_framework(html: str, headers: Dict[str, str] = None) -> str:
    """Auto-detects CMS or framework from HTML signatures and HTTP headers."""
    html_lower = html.lower() if html else ""
    headers = headers or {}
    server_header = headers.get("server", "").lower()
    x_powered_by = headers.get("x-powered-by", "").lower()

    if "wp-content" in html_lower or "wp-includes" in html_lower or "wordpress" in html_lower:
        return "wordpress"
    if "cdn.shopify.com" in html_lower or "shopify.theme" in html_lower:
        return "shopify"
    if "_next/static" in html_lower or "__next_data__" in html_lower:
        return "nextjs"
    if "data-wf-page" in html_lower or "webflow" in html_lower:
        return "webflow"
    if "nuxt" in html_lower or "__nuxt" in html_lower:
        return "nuxtjs"
    if "laravel" in x_powered_by or "laravel_session" in str(headers).lower():
        return "laravel"
    if "nginx" in server_header:
        return "nginx"
    if "apache" in server_header:
        return "apache"
    return "custom"


class ActionPlanner:
    def __init__(self, framework: str = "custom"):
        self.framework = framework.lower()

    def generate_plan(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        plan = []
        for issue in issues:
            item = self._convert_issue_to_action(issue)
            if item:
                plan.append(item)

        # Sort plan by Impact/Effort ratio:
        # Tier order: quick_win (1) -> strategic (2) -> fill_in (3) -> time_sink (4)
        tier_weights = {
            "quick_win": 1,
            "strategic": 2,
            "fill_in": 3,
            "time_sink": 4,
        }
        plan.sort(key=lambda x: (tier_weights.get(x["impact_effort_tier"], 5), -x["priority_score"]))
        return plan

    def _convert_issue_to_action(self, issue: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        check_id = issue.get("check_id", "")
        url = issue.get("url", "")
        title = issue.get("title", "")
        severity = issue.get("severity", "warning")
        evidence = issue.get("evidence", {})

        # Default classifications
        impact = "medium"
        effort = "low"
        priority_score = 50

        # Severity weighting
        if severity == "critical":
            impact = "high"
            priority_score += 40
        elif severity == "warning":
            impact = "medium"
            priority_score += 20
        else:
            impact = "low"
            priority_score += 10

        # Specific Issue Handlers
        if check_id == "http_status":
            code = evidence.get("status_code", 404)
            what = f"الصفحة تعيد رمز خطأ HTTP {code} بدلاً من كود النجاح 200."
            why = "محركات البحث تتوقف عن فهرسة الصفحات ذات الرموز المعطلة وتفقد ثقة الزوار."
            impact_desc = "استعادة حركة الزوار وقوة الروابط المفقودة وحماية ميزانية الزحف."
            steps = [
                "تحديد الصفحة البديلة الأكثر صلة بالمحتوى الأصلي.",
                "إنشاء تحويل 301 دائم من الرابط المعطل إلى الرابط الصحيح.",
                "تحديث أي روابط داخلية أو قوائم كانت تشير إلى هذا الرابط القديم."
            ]
            effort = "low"
            patch = self._generate_redirect_patch(url, "/target-replacement", 301)

        elif check_id == "metadata" and "NOINDEX" in title:
            what = "الصفحة محظورة من الفهرسة بواسطة وسم noindex في الـ meta robots."
            why = "وجود noindex يمنع ظهور الصفحة تماماً في نتائج بحث جوجل وجميع محركات البحث."
            impact_desc = "إتاحة الصفحة للفهرسة والظهور الفوري في نتائج البحث وجلب زيارات جديدة."
            impact = "high"
            effort = "low"
            steps = [
                "فحص إعدادات السيو للصفحة أو إعدادات القالب.",
                "إزالة توجيه noindex أو تحويله إلى 'index, follow'.",
                "طلب إعادة الفهرسة عبر Google Search Console فور التعديل."
            ]
            patch = self._generate_robots_meta_patch("index, follow")

        elif check_id in ("canonicals", "canonical"):
            what = "مشكلة في وسم الرابط الأساسي (Canonical Tag) إما مفقود أو يشير لرابط خاطئ."
            why = "تشتت إشارات الترتيب وتسبب مشاكل المحتوى المكرر بين الروابط المتشابهة."
            impact_desc = "توحيد سلطة الصفحة وضمان أرشفة النسخة الرسمية المفضلة فقط."
            impact = "high"
            effort = "low"
            steps = [
                "تحديد الرابط النهائي المعتمد للصفحة متضمناً https و www بدقة.",
                "إضافة وسم canonical يشير بشكل مباشر إلى الرابط المعتمد.",
            ]
            patch = self._generate_canonical_patch(url)

        elif check_id in ("schema", "schema_gaps"):
            what = "غياب أو نقص البيانات المنظمة (Structured Data / JSON-LD)."
            why = "البيانات المنظمة تمنح موقعك المقتطفات المميزة (Rich Snippets) في جوجل وتؤهله للاقتباس في محركات الذكاء الاصطناعي."
            impact_desc = "زيادة نسبة النقر إلى الظهور (CTR) بنسبة 20-30% وظهور النجوم والأسئلة الشائعة."
            impact = "high"
            effort = "medium"
            steps = [
                "إنشاء كود Schema JSON-LD متوافق مع معايير Schema.org.",
                "إدراج الكود في وسم <head> للصفحة.",
                "فحص صحة الكود عبر أداة Rich Results Test من جوجل."
            ]
            patch = self._generate_schema_patch(url, title)

        elif check_id == "orphan_pages":
            what = "صفحة يتيمة موجودة في خريطة الموقع ولكن لا توجد روابط داخلية تشير إليها."
            why = "صعوبة زحف عناكب البحث إليها وضعف سلطة الصفحة لعدم وصول روابط داخلية لها."
            impact_desc = "توزيع قوة الموقع (Internal PageRank) إلى الصفحة وتسهيل وصول الزوار إليها."
            impact = "medium"
            effort = "low"
            steps = [
                "اختر من 2 إلى 3 مقالات أو أقسام ذات صلة وثيقة بموضوع الصفحة.",
                "أضف روابط سياقية طبيعية باستخدام نصوص روابط (Anchor Text) دقيقة تشير لهذه الصفحة.",
            ]
            patch = f'<!-- أضف هذا الرابط في المقالات ذات الصلة -->\n<a href="{url}">اقرأ المزيد حول الموضوع</a>'

        else:
            what = title
            why = issue.get("details", "")
            impact_desc = "تحسين الجودة الفنية للسيو وتعزيز رضا الزائر وسرعة الزحف."
            effort = "medium"
            steps = ["مراجعة مصدر الكود وإصلاح التوجيه وفق الإرشادات."]
            patch = f"// راجع الرابط: {url}\n// التوصية: {issue.get('suggestion', {}).get('recommendation', 'قم بالإصلاح')}"

        # Determine Impact / Effort Tier
        if impact == "high" and effort == "low":
            tier = "quick_win"
            tier_label = "مكسب سريع (أولوية قصوى)"
        elif impact == "high" and effort in ("medium", "high"):
            tier = "strategic"
            tier_label = "إصلاح استراتيجي هام"
        elif impact in ("medium", "low") and effort == "low":
            tier = "fill_in"
            tier_label = "تحسين سريع"
        else:
            tier = "time_sink"
            tier_label = "تحسين لاحق"

        return {
            "issue_id": issue.get("fingerprint") or check_id,
            "check_id": check_id,
            "url": url,
            "what_is_it": what,
            "why_it_matters": why,
            "expected_impact": impact_desc,
            "impact_level": impact,
            "effort_level": effort,
            "impact_effort_tier": tier,
            "impact_effort_label": tier_label,
            "priority_score": priority_score,
            "step_by_step_fix": steps,
            "ready_code_patch": patch,
            "detected_framework": self.framework,
        }

    def _generate_redirect_patch(self, from_url: str, to_url: str, code: int = 301) -> str:
        from urllib.parse import urlparse
        path = urlparse(from_url).path or from_url
        if self.framework == "wordpress":
            return (
                f"// أضف في نهاية ملف functions.php في القالب النشط:\n"
                f"add_action('template_redirect', function() {{\n"
                f"    if (is_404() && strpos($_SERVER['REQUEST_URI'], '{path}') !== false) {{\n"
                f"        wp_redirect('{to_url}', {code});\n"
                f"        exit;\n"
                f"    }}\n"
                f"}});"
            )
        elif self.framework == "nextjs":
            return (
                f"// في ملف next.config.js أضف داخل redirects():\n"
                f"async redirects() {{\n"
                f"  return [\n"
                f"    {{\n"
                f"      source: '{path}',\n"
                f"      destination: '{to_url}',\n"
                f"      permanent: {'true' if code == 301 else 'false'},\n"
                f"    }},\n"
                f"  ];\n"
                f"}}"
            )
        elif self.framework == "nginx":
            return f"# أضف داخل بلوك server في ملف nginx.conf:\nrewrite ^{path}$ {to_url} permanent;"
        else:
            # Default .htaccess Apache
            return f"# أضف في بداية ملف .htaccess:\nRedirect {code} {path} {to_url}"

    def _generate_robots_meta_patch(self, directive: str = "index, follow") -> str:
        if self.framework == "wordpress":
            return (
                f"// في إعدادات Yoast أو Rank Math: اجعل خيار Robots Meta = '{directive}'.\n"
                f"// أو برمجياً عبر functions.php:\n"
                f"add_filter('wp_robots', function($robots) {{\n"
                f"    $robots['noindex'] = false;\n"
                f"    $robots['index'] = true;\n"
                f"    $robots['follow'] = true;\n"
                f"    return $robots;\n"
                f"}});"
            )
        elif self.framework == "nextjs":
            return (
                f"// في صفحة Next.js App Router (page.tsx):\n"
                f"export const metadata = {{\n"
                f"  robots: {{\n"
                f"    index: true,\n"
                f"    follow: true,\n"
                f"  }},\n"
                f"}};"
            )
        else:
            return f'<meta name="robots" content="{directive}" />'

    def _generate_canonical_patch(self, url: str) -> str:
        if self.framework == "nextjs":
            return (
                f"// في ملف page.tsx (Next.js):\n"
                f"export const metadata = {{\n"
                f"  alternates: {{\n"
                f"    canonical: '{url}',\n"
                f"  }},\n"
                f"}};"
            )
        else:
            return f'<link rel="canonical" href="{url}" />'

    def _generate_schema_patch(self, url: str, title: str) -> str:
        return (
            f'<script type="application/ld+json">\n'
            f'{{\n'
            f'  "@context": "https://schema.org",\n'
            f'  "@type": "Article",\n'
            f'  "headline": "{title}",\n'
            f'  "mainEntityOfPage": "{url}",\n'
            f'  "datePublished": "2026-11-16T12:00:00+02:00",\n'
            f'  "dateModified": "2026-11-16T12:00:00+02:00",\n'
            f'  "author": {{\n'
            f'    "@type": "Person",\n'
            f'    "name": "إسماعيل الأسيوطي"\n'
            f'  }}\n'
            f'}}\n'
            f'</script>'
        )
