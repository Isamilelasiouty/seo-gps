"""
Internal PageRank calculation to compute link equity and identify buried pages.
Author: Ismail El Asiouty
"""
from typing import Dict, List, Set, Any


def compute_internal_pagerank(
    all_urls: List[str],
    inbound_graph: Dict[str, Set[str]],
    outbound_counts: Dict[str, int],
    iterations: int = 20,
    damping: float = 0.85
) -> Dict[str, float]:
    """
    Computes internal PageRank link equity scores for all crawled URLs.
    Scores are normalized between 0.0 and 100.0.
    """
    n = len(all_urls)
    if n == 0:
        return {}

    initial_score = 1.0 / n
    scores = {url: initial_score for url in all_urls}

    for _ in range(iterations):
        new_scores = {}
        for url in all_urls:
            incoming = inbound_graph.get(url, set())
            rank_sum = sum(
                scores[src] / outbound_counts[src]
                for src in incoming
                if outbound_counts.get(src, 0) > 0
            )
            new_scores[url] = (1.0 - damping) / n + damping * rank_sum
        scores = new_scores

    # Normalize to 0-100 scale
    max_score = max(scores.values()) if scores else 1.0
    if max_score <= 0:
        return {u: 0.0 for u in all_urls}

    return {u: round((s / max_score) * 100.0, 2) for u, s in scores.items()}
