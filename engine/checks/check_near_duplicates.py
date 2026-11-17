"""
Near-Duplicate Content Detection using 64-bit SimHash.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
import hashlib
import re
from .base import BaseCheck, Issue


def compute_simhash(text: str) -> int:
    """Computes a 64-bit SimHash for normalized text."""
    if not text:
        return 0
    words = re.findall(r"\w+", text.lower())
    if not words:
        return 0

    shingles = [" ".join(words[i:i+3]) for i in range(max(1, len(words) - 2))]
    v = [0] * 64

    for shingle in shingles:
        h = int(hashlib.md5(shingle.encode("utf-8")).hexdigest(), 16)
        for i in range(64):
            bit = (h >> i) & 1
            v[i] += 1 if bit else -1

    fingerprint = 0
    for i in range(64):
        if v[i] > 0:
            fingerprint |= (1 << i)
    return fingerprint


def hamming_distance(h1: int, h2: int) -> int:
    """Calculates bitwise Hamming distance between two 64-bit hashes."""
    x = (h1 ^ h2) & ((1 << 64) - 1)
    tot = 0
    while x:
        tot += 1
        x &= x - 1
    return tot


class NearDuplicatesCheck(BaseCheck):
    id = "near_duplicates"
    title = "Near-Duplicate Content Detection (SimHash)"
    category = "content"
    default_severity = "warning"

    def analyze(
        self,
        current_snapshot: Dict[str, Any],
        previous_snapshot: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Issue]:
        issues = []
        url = current_snapshot.get("url", "")
        body_text = current_snapshot.get("main_content_text", "") or current_snapshot.get("body_text", "") or current_snapshot.get("text_sample", "") or current_snapshot.get("description", "")
        word_count = current_snapshot.get("word_count", 0)

        if word_count < 100:
            return issues

        h1 = compute_simhash(body_text)
        all_snapshots = context.get("all_snapshots", {}) if context else {}
        if h1 == 0 or not all_snapshots:
            return issues

        for other_url, other_snap in all_snapshots.items():
            if other_url == url:
                continue
            other_text = other_snap.get("main_content_text", "") or other_snap.get("body_text", "") or other_snap.get("text_sample", "") or other_snap.get("description", "")
            other_wc = other_snap.get("word_count", 0)
            if other_wc < 100:
                continue

            h2 = compute_simhash(other_text)
            dist = hamming_distance(h1, h2)
            similarity = (64 - dist) / 64.0

            if similarity >= 0.85 and url < other_url:
                issues.append(
                    Issue(
                        check_id=self.id,
                        severity=self.default_severity,
                        category=self.category,
                        url=url,
                        title=f"محتوى شبه مكرر بنسبة {int(similarity * 100)}% (Near-Duplicate)",
                        details=f"تم رصد تطابق في المحتوى بنسبة {int(similarity * 100)}% مع الصفحة: {other_url}. المحتوى المكرر يؤدي إلى تنافس الصفحات على نفس الكلمات (Cannibalization) وتشتيت قوة الترتيب.",
                        evidence={
                            "url_a": url,
                            "url_b": other_url,
                            "similarity_percent": int(similarity * 100),
                            "hamming_distance": dist,
                        },
                        suggestion={
                            "action": "consolidate_or_differentiate",
                            "recommendation": "قم بدمج الصفحتين في صفحة واحدة قوية مع تحويل 301، أو أعد كتابة إحداهما لتقديم قيمة مميزة وزوايا حصرية لكل صفحة.",
                        },
                    )
                )

        return issues
