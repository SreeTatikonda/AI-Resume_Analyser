"""Pluggable embedding provider — local sentence-transformers, OpenAI, or Bedrock.

Local embeddings run on CPU by default and require no API key — ideal for
development and self-hosted deployments. OpenAI / Bedrock kick in when set via
EMBEDDING_PROVIDER.
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from functools import lru_cache

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingProvider(ABC):
    """Common interface for embedding back-ends."""

    @abstractmethod
    def embed(self, texts: list[str]) -> np.ndarray:
        """Return an (n, d) float32 numpy array of L2-normalized embeddings."""

    def embed_one(self, text: str) -> np.ndarray:
        return self.embed([text])[0]


# --------------------------------------------------------------------------- #
# Local — sentence-transformers
# --------------------------------------------------------------------------- #
class LocalEmbeddingProvider(EmbeddingProvider):
    """sentence-transformers running on CPU/GPU locally."""

    def __init__(self, model_name: str | None = None) -> None:
        from sentence_transformers import SentenceTransformer  # lazy import

        self.model_name = model_name or settings.EMBEDDING_MODEL
        # Keep model cache in /tmp for ephemeral containers
        cache = os.environ.get("HF_HOME", "/tmp/hf_cache")
        os.makedirs(cache, exist_ok=True)
        os.environ.setdefault("HF_HOME", cache)
        logger.info("loading_local_embedder", model=self.model_name)
        self.model = SentenceTransformer(self.model_name, cache_folder=cache)

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 384), dtype=np.float32)
        emb = self.model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return emb.astype(np.float32)


# --------------------------------------------------------------------------- #
# OpenAI
# --------------------------------------------------------------------------- #
class OpenAIEmbeddingProvider(EmbeddingProvider):
    """text-embedding-3-small / -large via the OpenAI API."""

    def __init__(self, model_name: str | None = None) -> None:
        from openai import OpenAI  # lazy import

        self.model_name = model_name or "text-embedding-3-small"
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 1536), dtype=np.float32)
        resp = self.client.embeddings.create(model=self.model_name, input=texts)
        vecs = np.array([d.embedding for d in resp.data], dtype=np.float32)
        # L2-normalize
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vecs / norms


# --------------------------------------------------------------------------- #
# AWS Bedrock (Titan)
# --------------------------------------------------------------------------- #
class BedrockEmbeddingProvider(EmbeddingProvider):
    """Amazon Titan / Cohere embeddings via Bedrock Runtime."""

    def __init__(self, model_id: str | None = None) -> None:
        import boto3  # lazy import
        import json

        self.model_id = model_id or settings.BEDROCK_EMBEDDING_MODEL_ID
        self.client = boto3.client("bedrock-runtime", region_name=settings.AWS_REGION)
        self._json = json

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 1024), dtype=np.float32)
        out: list[list[float]] = []
        for text in texts:
            body = self._json.dumps({"inputText": text})
            resp = self.client.invoke_model(modelId=self.model_id, body=body)
            payload = self._json.loads(resp["body"].read())
            out.append(payload["embedding"])
        vecs = np.array(out, dtype=np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vecs / norms


# --------------------------------------------------------------------------- #
# Factory
# --------------------------------------------------------------------------- #
@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    provider = settings.EMBEDDING_PROVIDER
    if provider == "openai":
        return OpenAIEmbeddingProvider()
    if provider == "bedrock":
        return BedrockEmbeddingProvider()
    return LocalEmbeddingProvider()
