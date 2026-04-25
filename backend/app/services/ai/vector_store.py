"""In-memory FAISS vector store used for per-request RAG.

For each analysis we build a tiny ephemeral index from the JD chunks and query
it with the resume bullets. This is faster and cheaper than a persistent
vector DB for a single comparison and keeps the architecture stateless.

For multi-tenant persisted vector storage you would swap in pgvector or
Pinecone — see VECTOR_STORE setting.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class RetrievalHit:
    text: str
    score: float
    index: int


class InMemoryVectorIndex:
    """Cosine-similarity index over a small corpus."""

    def __init__(self, embeddings: np.ndarray, texts: list[str]) -> None:
        if embeddings.ndim != 2:
            raise ValueError("Embeddings must be 2-D")
        if embeddings.shape[0] != len(texts):
            raise ValueError("Embeddings and texts length mismatch")
        # Already L2 normalised by provider, but be safe
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self._emb = (embeddings / norms).astype(np.float32)
        self._texts = list(texts)

    def search(self, query: np.ndarray, k: int = 5) -> list[RetrievalHit]:
        if self._emb.shape[0] == 0:
            return []
        q = query.astype(np.float32)
        qn = np.linalg.norm(q)
        if qn == 0:
            return []
        q = q / qn
        sims = self._emb @ q
        k = min(k, sims.shape[0])
        top_idx = np.argpartition(-sims, k - 1)[:k]
        top_idx = top_idx[np.argsort(-sims[top_idx])]
        return [
            RetrievalHit(text=self._texts[i], score=float(sims[i]), index=int(i))
            for i in top_idx
        ]

    def search_batch(self, queries: np.ndarray, k: int = 5) -> list[list[RetrievalHit]]:
        return [self.search(q, k) for q in queries]
