"""
Content similarity and keyword cannibalization analysis (Python Fallback & Engine).
Author: Ismail El Asiouty
"""
import math
import re
from typing import List, Dict, Any


def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text."""
    if not text:
        return []
    # Support both Arabic and Latin characters
    words = re.findall(r"[\w\u0600-\u06FF]+", text.lower())
    return [w for w in words if len(w) > 2]


def compute_tf_idf_similarity(docs: List[str]) -> List[List[float]]:
    """Compute pairwise cosine similarity using TF-IDF."""
    tokenized_docs = [tokenize(doc) for doc in docs]
    n_docs = len(tokenized_docs)
    if n_docs == 0:
        return []

    # Vocabulary & DF
    vocab = {}
    df = {}
    for tokens in tokenized_docs:
        seen = set(tokens)
        for t in seen:
            df[t] = df.get(t, 0) + 1
            if t not in vocab:
                vocab[t] = len(vocab)

    # Compute TF-IDF vectors
    vectors = []
    for tokens in tokenized_docs:
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        vec = {}
        norm_sq = 0.0
        for t, count in tf.items():
            idf = math.log((1.0 + n_docs) / (1.0 + df.get(t, 1))) + 1.0
            val = (count / len(tokens)) * idf
            vec[t] = val
            norm_sq += val * val
        norm = math.sqrt(norm_sq) or 1.0
        vectors.append({t: v / norm for t, v in vec.items()})

    # Pairwise cosine
    matrix = [[0.0] * n_docs for _ in range(n_docs)]
    for i in range(n_docs):
        matrix[i][i] = 1.0
        for j in range(i + 1, n_docs):
            v1, v2 = vectors[i], vectors[j]
            # Dot product
            score = sum(v1[k] * v2[k] for k in v1 if k in v2)
            matrix[i][j] = round(score, 4)
            matrix[j][i] = matrix[i][j]

    return matrix


def find_cannibalization_clusters(
    pages: List[Dict[str, Any]],
    threshold: float = 0.80
) -> List[Dict[str, Any]]:
    """
    Find pairs of pages competing for the same topics/content.
    """
    if len(pages) < 2:
        return []

    combined_texts = []
    for p in pages:
        t = p.get("title", "")
        h1s = " ".join(p.get("h1_tags", []))
        desc = p.get("description", "")
        combined_texts.append(f"{t} {h1s} {desc}")

    sim_matrix = compute_tf_idf_similarity(combined_texts)
    clusters = []

    for i in range(len(pages)):
        for j in range(i + 1, len(pages)):
            score = sim_matrix[i][j]
            if score >= threshold:
                clusters.append({
                    "url_a": pages[i].get("url"),
                    "title_a": pages[i].get("title"),
                    "url_b": pages[j].get("url"),
                    "title_b": pages[j].get("title"),
                    "similarity": score,
                })

    return clusters
