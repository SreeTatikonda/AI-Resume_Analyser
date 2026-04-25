"""Tests for PDF chunking + section heuristics (without an actual PDF)."""
from __future__ import annotations

from app.services.extraction.pdf_parser import _is_section_header, chunk_text


def test_section_header_detection() -> None:
    assert _is_section_header("EXPERIENCE") == "experience"
    assert _is_section_header("Education") == "education"
    assert _is_section_header("Technical Skills") == "skills"
    assert _is_section_header("Random sentence describing things") is None


def test_chunk_text_basic() -> None:
    text = "word " * 200
    chunks = list(chunk_text(text, chunk_size=50, overlap=10))
    assert len(chunks) >= 4
    assert all(len(c.split()) <= 50 for c in chunks)
