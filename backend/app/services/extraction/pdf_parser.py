"""PDF text extraction with section detection.

Uses PyMuPDF for layout-aware text extraction, then heuristically segments the
resume into sections (Experience, Education, Skills, Projects, Summary).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

import fitz  # PyMuPDF


SECTION_HEADERS = {
    "summary": ["summary", "professional summary", "profile", "objective", "about"],
    "experience": [
        "experience", "work experience", "professional experience",
        "employment", "employment history", "work history", "career",
    ],
    "education": ["education", "academic", "academics", "qualifications"],
    "skills": ["skills", "technical skills", "core skills", "competencies", "tech stack"],
    "projects": ["projects", "personal projects", "selected projects", "side projects"],
    "certifications": ["certifications", "certificates", "licenses"],
    "publications": ["publications", "research", "papers"],
    "awards": ["awards", "honors", "achievements"],
}


@dataclass
class ParsedResume:
    """Structured representation of a resume."""

    raw_text: str
    sections: dict[str, str] = field(default_factory=dict)
    bullets: list[str] = field(default_factory=list)
    page_count: int = 0


def _is_section_header(line: str) -> str | None:
    """Return the canonical section name if line is a header, else None."""
    cleaned = re.sub(r"[^a-z\s&]", "", line.strip().lower()).strip()
    if not cleaned or len(cleaned) > 40:
        return None
    for canonical, variants in SECTION_HEADERS.items():
        if cleaned in variants:
            return canonical
    return None


def _extract_bullets(text: str) -> list[str]:
    """Extract bullet-like lines from text."""
    bullets: list[str] = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        # Lines starting with bullet markers
        if re.match(r"^[\u2022\u2023\u25E6\u2043\u2219\-\*\u2010\u2011\u2012\u2013]\s+", line):
            cleaned = re.sub(
                r"^[\u2022\u2023\u25E6\u2043\u2219\-\*\u2010\u2011\u2012\u2013]\s+",
                "",
                line,
            )
            if len(cleaned) > 15:
                bullets.append(cleaned)
        elif len(line) > 40 and re.search(r"\b(led|built|developed|designed|implemented|created|deployed|managed|reduced|improved|increased|optimized|architected|delivered|launched|migrated|automated|integrated)\b", line.lower()):
            bullets.append(line)
    return bullets


def parse_pdf(pdf_bytes: bytes) -> ParsedResume:
    """Parse a PDF resume into structured form."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        all_text_parts: list[str] = []
        for page in doc:
            all_text_parts.append(page.get_text("text"))
        raw_text = "\n".join(all_text_parts)
        page_count = doc.page_count
    finally:
        doc.close()

    # Section segmentation
    sections: dict[str, list[str]] = {}
    current_section = "header"
    sections[current_section] = []

    for line in raw_text.split("\n"):
        header = _is_section_header(line)
        if header:
            current_section = header
            sections.setdefault(current_section, [])
            continue
        sections.setdefault(current_section, []).append(line)

    section_text = {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}
    bullets = _extract_bullets(raw_text)

    return ParsedResume(
        raw_text=raw_text,
        sections=section_text,
        bullets=bullets,
        page_count=page_count,
    )


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> Iterable[str]:
    """Split text into overlapping word chunks for embedding."""
    words = text.split()
    if not words:
        return
    step = max(chunk_size - overlap, 1)
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            yield chunk
        if i + chunk_size >= len(words):
            break
