"""
Content similarity and keyword cannibalization analysis using scalable TF-IDF & NearestNeighbors.
Author: Ismail El Asiouty
"""
from typing import List, Dict, Any
from engine.similarity import detect_cannibalization_clusters, normalize_arabic_text


def find_cannibalization_clusters(
    pages: List[Dict[str, Any]],
    threshold: float = 0.80
) -> List[Dict[str, Any]]:
    """
    Find pairs of pages competing for the same topics/content with O(N log N) scaling.
    """
    if len(pages) < 2:
        return []

    # Map page titles
    url_to_title = {p.get("url"): p.get("title", "") for p in pages if p.get("url")}

    raw_clusters = detect_cannibalization_clusters(pages, threshold=threshold)
    formatted_clusters = []
    for c in raw_clusters:
        formatted_clusters.append({
            "url_a": c["url_a"],
            "title_a": url_to_title.get(c["url_a"], ""),
            "url_b": c["url_b"],
            "title_b": url_to_title.get(c["url_b"], ""),
            "similarity": c["similarity_score"],
        })
    return formatted_clusters
