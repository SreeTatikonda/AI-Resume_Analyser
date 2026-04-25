"""Tests for the composite scorer using a tiny stub embedder."""
from __future__ import annotations

import numpy as np

from app.services.ai.embeddings import EmbeddingProvider
from app.services.extraction.pdf_parser import ParsedResume
from app.services.scoring.scorer import compute_scores


class _DummyEmbedder(EmbeddingProvider):
    """Hashes text to a deterministic unit vector — enough for shape/contract testing."""

    DIM = 16

    def embed(self, texts):  # type: ignore[override]
        out = np.zeros((len(texts), self.DIM), dtype=np.float32)
        for i, t in enumerate(texts):
            for ch in t.lower():
                out[i, ord(ch) % self.DIM] += 1.0
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (out / norms).astype(np.float32)


def test_compute_scores_smoke() -> None:
    resume = ParsedResume(
        raw_text="Built REST APIs with FastAPI and PostgreSQL. 5 years of Python.",
        sections={
            "experience": "Built REST APIs with FastAPI and PostgreSQL.",
            "skills": "Python, FastAPI, PostgreSQL, AWS",
        },
        bullets=[
            "Built REST APIs with FastAPI",
            "Designed PostgreSQL schemas with 99.9% uptime",
            "Deployed services to AWS with Docker",
        ],
        page_count=1,
    )
    jd = "We need a Python engineer with FastAPI, PostgreSQL, and AWS experience. 3+ years."
    out = compute_scores(resume=resume, jd_text=jd, embedder=_DummyEmbedder())

    assert 0 <= out.overall <= 100
    assert 0 <= out.semantic <= 100
    assert 0 <= out.skill <= 100
    assert "FastAPI" in {s.name for s in out.matched_skills}
    assert isinstance(out.missing_skills, list)
    assert isinstance(out.section_scores, dict)


def test_no_jd_skills_returns_zero_skill_score() -> None:
    resume = ParsedResume(
        raw_text="Python developer",
        sections={"skills": "Python"},
        bullets=["Wrote Python"],
        page_count=1,
    )
    out = compute_scores(resume=resume, jd_text="We want someone friendly and curious.", embedder=_DummyEmbedder())
    assert out.skill == 0.0
