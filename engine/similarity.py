"""
MinHash + LSH and TF-IDF for large-scale duplicate & cannibalization detection.
Handles up to 1,000,000 pages with bounded memory and native Arabic NLP support.
Author: Ismail El Asiouty
"""
import re
import hashlib
from typing import List, Dict, Set, Tuple, Any
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

# Complete Arabic Text Normalizer
ARABIC_DIACRITICS = re.compile(r"[\u064B-\u0652\u0670]")
ARABIC_TATWEEL = re.compile(r"\u0640")


def normalize_arabic_text(text: str) -> str:
    """Standardizes Arabic characters, strips diacritics and tatweel."""
    if not text:
        return ""
    # Strip Tashkeel & Tatweel
    text = ARABIC_DIACRITICS.sub("", text)
    text = ARABIC_TATWEEL.sub("", text)
    # Standardize Alef variants
    text = re.sub(r"[إأآا]", "ا", text)
    # Standardize Taa Marbuta
    text = re.sub(r"ة", "ه", text)
    # Standardize Yaa & Alef Maksura
    text = re.sub(r"[ىي]", "ي", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


class MinHashLSHClusterer:
    """Scalable near-duplicate detection using MinHash and LSH bands."""
    def __init__(self, num_perm: int = 64, num_bands: int = 8):
        self.num_perm = num_perm
        self.num_bands = num_bands
        self.rows_per_band = num_perm // num_bands
        self.buckets: Dict[Tuple[int, int], List[str]] = defaultdict(list)

    def _shingle(self, text: str, k: int = 4) -> Set[str]:
        words = normalize_arabic_text(text).split()
        if len(words) < k:
            return set(words)
        return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}

    def _compute_minhash(self, shingles: Set[str]) -> List[int]:
        sig: List[int] = []
        for i in range(self.num_perm):
            min_val = float('inf')
            prefix = f"{i}-"
            for s in shingles:
                h = int(hashlib.md5(f"{prefix}{s}".encode('utf-8')).hexdigest(), 16)
                if h < min_val:
                    min_val = h
            sig.append(min_val)
        return sig

    def index_page(self, url: str, text: str):
        shingles = self._shingle(text)
        if not shingles:
            return
        sig = self._compute_minhash(shingles)
        for b in range(self.num_bands):
            band_chunk = tuple(sig[b * self.rows_per_band : (b + 1) * self.rows_per_band])
            bucket_key = (b, hash(band_chunk))
            self.buckets[bucket_key].append(url)

    def find_near_duplicates(self) -> List[Tuple[str, str]]:
        candidate_pairs: Set[Tuple[str, str]] = set()
        for bucket_key, url_list in self.buckets.items():
            if len(url_list) > 1:
                # Deduplicate and compare
                unique_urls = list(set(url_list))
                for i in range(len(unique_urls)):
                    for j in range(i + 1, len(unique_urls)):
                        candidate_pairs.add(tuple(sorted([unique_urls[i], unique_urls[j]])))
        return list(candidate_pairs)


def detect_cannibalization_clusters(
    pages: List[Dict[str, Any]],
    threshold: float = 0.82
) -> List[Dict[str, Any]]:
    """
    TF-IDF with Nearest Neighbors to prevent O(n^2) compute on large scale.
    Identifies keyword cannibalization clusters accurately.
    """
    if len(pages) < 2:
        return []

    docs = [
        normalize_arabic_text(
            f"{p.get('title', '')} {p.get('h1', '')} {p.get('text_sample', '') or p.get('main_content_text', '')}"
        )
        for p in pages
    ]

    vectorizer = TfidfVectorizer(max_features=25000, ngram_range=(1, 2))
    try:
        tfidf_matrix = vectorizer.fit_transform(docs)
    except ValueError:
        # Empty vocabulary or completely stop words
        return []

    n_neighbors = min(10, len(pages))
    nn = NearestNeighbors(metric="cosine", algorithm="brute", n_neighbors=n_neighbors)
    nn.fit(tfidf_matrix)
    distances, indices = nn.kneighbors(tfidf_matrix)

    clusters: List[Dict[str, Any]] = []
    seen_pairs: Set[Tuple[str, str]] = set()

    for i, row in enumerate(indices):
        url_i = pages[i]["url"]
        for neighbor_idx, dist in zip(row[1:], distances[i][1:]):
            url_neighbor = pages[neighbor_idx]["url"]
            if url_i == url_neighbor:
                continue

            sim = 1.0 - float(dist)
            if sim >= threshold:
                pair = tuple(sorted([url_i, url_neighbor]))
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    clusters.append({
                        "url_a": pair[0],
                        "url_b": pair[1],
                        "similarity_score": round(float(sim), 3)
                    })

    return clusters
