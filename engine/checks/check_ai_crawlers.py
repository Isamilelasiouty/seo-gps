"""
AI Crawlers and GEO Readiness Check for robots.txt.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from .base import BaseCheck, Issue

AI_BOTS = [
    ("GPTBot", "OpenAI / SearchGPT", "بحث ChatGPT ومحركات الذكاء الاصطناعي لـ OpenAI"),
    ("ClaudeBot", "Anthropic Claude", "محرك الذكاء الاصطناعي Claude"),
    ("PerplexityBot", "Perplexity AI", "محرك إجابات وبحث Perplexity"),
    ("Google-Extended", "Google Gemini", "تدريب وتغذية نماذج Google Gemini"),
    ("CCBot", "Common Crawl", "بيانات التدريب المفتوحة لنماذج الذكاء الاصطناعي"),
    ("ByteSpider", "ByteDance", "نماذج وخوارزميات الذكاء الاصطناعي لـ ByteDance"),
]


class AiCrawlersCheck(BaseCheck):
    id = "ai_crawlers_audit"
    title = "AI Crawlers and GEO Visibility Audit"
    category = "ai_readiness"
    default_severity = "notice"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues = []
        parsed_path = current_snapshot.get("path", "")
        if parsed_path not in ("", "/"):
            return issues

        robots_txt = context.get("robots_txt_content", "") if context else ""
        if not robots_txt:
            return issues

        lines = [line.strip() for line in robots_txt.splitlines() if line.strip() and not line.strip().startswith("#")]

        blocked_bots = []
        current_agent = ""

        for line in lines:
            parts = line.split(":", 1)
            if len(parts) == 2:
                key = parts[0].strip().lower()
                val = parts[1].strip()
                if key == "user-agent":
                    current_agent = val
                elif key == "disallow" and val in ("/", "/*"):
                    for bot_name, org, purpose in AI_BOTS:
                        if current_agent.lower() == bot_name.lower():
                            blocked_bots.append((bot_name, org, purpose))

        if blocked_bots:
            bot_names_str = ", ".join([b[0] for b in blocked_bots])
            issues.append(
                Issue(
                    check_id=self.id,
                    severity="notice",
                    category=self.category,
                    url=current_snapshot.get("url", ""),
                    title=f"حظر عناكب محركات الذكاء الاصطناعي في robots.txt: ({bot_names_str})",
                    details=f"تم رصد قواعد حظر في ملف robots.txt تمنع عناكب الذكاء الاصطناعي التالية من الوصول: {bot_names_str}. إذا كنت ترغب في أن يقتبس بحث الذكاء الاصطناعي (مثل SearchGPT أو Perplexity) موقعك، يجب مراجعة هذا الحظر.",
                    evidence={
                        "blocked_bots": [b[0] for b in blocked_bots],
                        "rule": "Disallow: /",
                    },
                    suggestion={
                        "action": "configure_ai_robots",
                        "recommendation": "قم بالسماح للعناكب التي ترغب بالظهور فيها عبر إضافة: User-agent: GPTBot followed by Allow: / لزيادة فرصة ظهور علامتك التجارية في نتائج الذكاء الاصطناعي (GEO).",
                    },
                )
            )

        return issues
