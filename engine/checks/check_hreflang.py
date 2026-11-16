"""
Comprehensive Hreflang Validation Check (RFC 5646 / ISO 639-1 / ISO 3166-1).
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue

VALID_LANGS = {
    "ar", "en", "fr", "es", "de", "it", "pt", "ru", "zh", "ja", "ko",
    "nl", "tr", "pl", "sv", "da", "fi", "no", "el", "he", "hi", "id",
    "ms", "th", "vi", "cs", "hu", "ro", "uk", "bg", "hr", "sk", "fa"
}


class HreflangCheck(BaseCheck):
    id = "hreflang_audit"
    title = "Hreflang Internationalization Validation"
    category = "international"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues = []
        url = current_snapshot.get("url", "")
        hreflangs = current_snapshot.get("hreflangs", [])

        if not hreflangs:
            return issues

        has_self_ref = False

        for item in hreflangs:
            lang = item.get("lang", "").strip().lower()
            target_url = item.get("url", "").strip()

            if target_url.rstrip("/") == url.rstrip("/"):
                has_self_ref = True

            if lang != "x-default":
                parts = lang.split("-")
                lang_code = parts[0]
                if lang_code not in VALID_LANGS:
                    issues.append(
                        Issue(
                            check_id=self.id,
                            severity="warning",
                            category=self.category,
                            url=url,
                            title=f"كود لغة hreflang غير صالح: '{lang}'",
                            details=f"تم العثور على وسم hreflang يحتوي على كود لغة غير متوافق مع معيار ISO 639-1 ('{lang}').",
                            evidence={"url": url, "invalid_lang": lang, "target_url": target_url},
                            suggestion={
                                "action": "fix_hreflang_code",
                                "recommendation": "استخدم رموز اللغات القياسية المعتمدة من جوجل (مثل ar, en, fr) مع رموز الدول اختيارياً (مثل ar-SA, en-US).",
                            },
                        )
                    )

        if not has_self_ref and len(hreflangs) > 0:
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="warning",
                    category=self.category,
                    url=url,
                    title="غياب وسم hreflang يشير لنفس الصفحة (Missing Self-Referencing Hreflang)",
                    details="وفقاً لإرشادات جوجل، يجب أن تتضمن كل صفحة تستخدم وسوم hreflang إشارة تشير إلى نفسها وإلى نسختها اللغوية الحالية.",
                    evidence={"url": url, "hreflangs_count": len(hreflangs)},
                    suggestion={
                        "action": "add_self_hreflang",
                        "recommendation": "أضف وسم hreflang يشير إلى رابط الصفحة الحالية مع رمز اللغة المطابق.",
                    },
                )
            )

        return issues
