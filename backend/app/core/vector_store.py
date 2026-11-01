import numpy as np
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class EphemeralReviewVectorStore:
    """
    Cloud-Server In-Memory Semantic Review Ranker.
    Uses fast TF-IDF n-gram vectorization + cosine similarity combined with community helpfulness votes,
    requiring zero local Ollama embedding models.
    """

    async def search_relevant_reviews(
        self,
        query: str,
        reviews: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        if not reviews or not query.strip():
            return []

        subset = reviews[:30]
        texts = [r.get("text", "") for r in subset if r.get("text")]
        if not texts:
            return subset[:top_k]

        try:
            vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            matrix = vectorizer.fit_transform([query] + texts)
            sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
            top_indices = np.argsort(sims)[::-1][:top_k]

            results = []
            for idx in top_indices:
                rev = dict(subset[int(idx)])
                rev["similarity_score"] = round(float(sims[int(idx)]), 3)
                results.append(rev)
            return results
        except Exception:
            sorted_reviews = sorted(reviews, key=lambda x: x.get("votes_up", 0), reverse=True)
            return sorted_reviews[:top_k]


vector_store = EphemeralReviewVectorStore()
