"""Composite scoring: weighted blend of semantic similarity, skill overlap,
and experience signal.

This separation matters: each sub-score is independently interpretable, so the
UI can show *why* a resume scored where it did and the LLM feedback can
reference the same numbers.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np

from app.services.ai.embeddings import EmbeddingProvider
from app.services.extraction.pdf_parser import ParsedResume, chunk_text
from app.services.extraction.skill_extractor import (
    ExtractedSkill,
    extract_skills,
    normalize,
)


@dataclass
class ScoreBreakdown:
    overall: float
    semantic: float
    skill: float
    experience: float
    matched_skills: list[ExtractedSkill]
    missing_skills: list[str]
    section_scores: dict[str, float]
    top_resume_excerpts: list[str]


WEIGHTS = {
    "semantic": 0.50,
    "skill": 0.30,
    "experience": 0.20,
}


_SENIORITY_KEYWORDS = {
    "intern": 0,
    "entry": 1,
    "junior": 1,
    "associate": 2,
    "mid": 3,
    "intermediate": 3,
    "senior": 4,
    "sr.": 4,
    "lead": 5,
    "principal": 6,
    "staff": 6,
    "manager": 5,
    "director": 7,
    "vp": 8,
    "head of": 7,
}

_YEAR_RE = re.compile(r"(\d+)\+?\s*(?:years?|yrs?)", re.IGNORECASE)


def _seniority_level(text: str) -> int:
    text_l = text.lower()
    levels = [v for k, v in _SENIORITY_KEYWORDS.items() if k in text_l]
    return max(levels) if levels else 3


def _years_required(text: str) -> int | None:
    matches = _YEAR_RE.findall(text)
    if not matches:
        return None
    return max(int(m) for m in matches)


def _years_in_resume(text: str) -> int:
    """Approximate by counting year-ranges of the form 2019-2024."""
    pattern = re.compile(r"(20\d{2}|19\d{2})\s*[-–to]+\s*(20\d{2}|19\d{2}|present|current)", re.IGNORECASE)
    total = 0
    for start, end in pattern.findall(text):
        try:
            s = int(start)
            e = 2026 if end.lower() in ("present", "current") else int(end)
            total += max(0, e - s)
        except ValueError:
            continue
    return total


def _experience_score(resume_text: str, jd_text: str) -> float:
    needed = _years_required(jd_text)
    have = _years_in_resume(resume_text)
    if needed is None:
        # Fall back to seniority alignment
        diff = abs(_seniority_level(resume_text) - _seniority_level(jd_text))
        return max(0.0, 100.0 - diff * 15.0)
    if have >= needed:
        return 100.0
    if needed == 0:
        return 100.0
    ratio = have / needed
    return max(20.0, min(100.0, ratio * 100.0))


def compute_scores(
    *,
    resume: ParsedResume,
    jd_text: str,
    embedder: EmbeddingProvider,
) -> ScoreBreakdown:
    """Compute the full score breakdown for one resume × JD pair."""
    resume_text = resume.raw_text
    norm_jd = normalize(jd_text)

    # ---- Skill overlap ----
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(jd_text)
    resume_skill_names = {s.name for s in resume_skills}
    jd_skill_names = {s.name for s in jd_skills}

    matched_names = resume_skill_names & jd_skill_names
    missing_names = jd_skill_names - resume_skill_names
    matched = [s for s in resume_skills if s.name in matched_names]

    if jd_skill_names:
        skill_score = (len(matched_names) / len(jd_skill_names)) * 100.0
    else:
        skill_score = 0.0

    # ---- Semantic similarity ----
    jd_chunks = list(chunk_text(jd_text, chunk_size=80, overlap=20))
    resume_chunks = resume.bullets or list(chunk_text(resume_text, chunk_size=80, overlap=20))

    semantic_score = 0.0
    top_excerpts: list[str] = []
    section_scores: dict[str, float] = {}

    if jd_chunks and resume_chunks:
        jd_emb = embedder.embed(jd_chunks)
        res_emb = embedder.embed(resume_chunks)

        # cosine similarity matrix (vectors already L2 normalized)
        sims = res_emb @ jd_emb.T  # shape (R, J)

        # For each JD chunk, take the best matching resume chunk
        best_per_jd = sims.max(axis=0)
        semantic_score = float(np.clip(best_per_jd.mean() * 100.0, 0, 100))

        # For each resume chunk, store its best JD match — use to pick top excerpts
        best_per_resume = sims.max(axis=1)
        top_idx = np.argsort(-best_per_resume)[:8]
        top_excerpts = [resume_chunks[i] for i in top_idx]

        # Per-section semantic score
        section_scores = {}
        for sect_name, sect_text in resume.sections.items():
            if sect_name == "header" or not sect_text.strip():
                continue
            sect_chunks = list(chunk_text(sect_text, chunk_size=80, overlap=20))
            if not sect_chunks:
                continue
            sect_emb = embedder.embed(sect_chunks)
            sect_sims = sect_emb @ jd_emb.T
            section_scores[sect_name] = float(np.clip(sect_sims.max(axis=0).mean() * 100.0, 0, 100))

    # ---- Experience ----
    experience = _experience_score(resume_text, jd_text)

    # ---- Overall ----
    overall = (
        WEIGHTS["semantic"] * semantic_score
        + WEIGHTS["skill"] * skill_score
        + WEIGHTS["experience"] * experience
    )

    return ScoreBreakdown(
        overall=round(overall, 2),
        semantic=round(semantic_score, 2),
        skill=round(skill_score, 2),
        experience=round(experience, 2),
        matched_skills=matched,
        missing_skills=sorted(missing_names),
        section_scores={k: round(v, 2) for k, v in section_scores.items()},
        top_resume_excerpts=top_excerpts,
    )
