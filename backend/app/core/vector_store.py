import numpy as np
from typing import List, Dict, Any, Tuple
from app.core.ollama_client import ollama_client

class EphemeralReviewVectorStore:
    """
    In-memory dynamic vector index for game reviews, patch notes, and news chunks.
    Uses local Ollama embeddings (nomic-embed-text) and fast numpy cosine similarity.
    """
    
    @staticmethod
    def _cosine_similarity(vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
        norm_v = np.linalg.norm(vec)
        norm_m = np.linalg.norm(matrix, axis=1)
        # Avoid division by zero
        denom = (norm_m * norm_v)
        denom[denom == 0] = 1e-10
        return np.dot(matrix, vec) / denom

    async def search_relevant_reviews(
        self,
        query: str,
        reviews: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Embeds reviews on-demand and returns top_k semantically relevant reviews for the query.
        """
        if not reviews or not query.strip():
            return []

        # Prepare texts to embed
        texts = [r["text"] for r in reviews[:30]] # Keep to top 30 for speed
        if not texts:
            return []

        try:
            # Batch embed all review chunks + the query using local Ollama nomic-embed-text
            all_inputs = [query] + texts
            embeddings = await ollama_client.embed(all_inputs)

            if len(embeddings) < 2:
                return reviews[:top_k]

            query_vec = np.array(embeddings[0], dtype=np.float32)
            review_matrix = np.array(embeddings[1:], dtype=np.float32)

            similarities = self._cosine_similarity(query_vec, review_matrix)
            top_indices = np.argsort(similarities)[::-1][:top_k]

            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                rev = dict(reviews[idx])
                rev["similarity_score"] = round(score, 3)
                results.append(rev)

            return results
        except Exception as e:
            print(f"Vector search embedding error: {e}. Falling back to top helpful reviews.")
            # Graceful fallback: sort by votes_up or weighted_score
            sorted_reviews = sorted(reviews, key=lambda x: x.get("votes_up", 0), reverse=True)
            return sorted_reviews[:top_k]

vector_store = EphemeralReviewVectorStore()
