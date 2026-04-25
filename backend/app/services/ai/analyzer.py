"""Top-level orchestrator: parse → score → RAG retrieve → LLM feedback.

This is what the API and Celery worker both call. Returns a fully populated
result dict that maps directly to the AnalysisResponse schema.
"""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from app.core.logging import get_logger
from app.services.ai.embeddings import get_embedding_provider
from app.services.extraction.pdf_parser import parse_pdf
from app.services.llm.factory import get_llm_client
from app.services.llm.prompts import PROMPT_VERSION, build_feedback_prompt
from app.services.scoring.scorer import compute_scores

logger = get_logger(__name__)


def _safe_parse_json(text: str) -> dict[str, Any]:
    """Parse JSON from an LLM response, tolerating fenced code blocks."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline:].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find a JSON object substring
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if 0 <= start < end:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
    return {"raw": text}


def hash_text(text: str | bytes) -> str:
    if isinstance(text, str):
        text = text.encode("utf-8")
    return hashlib.sha256(text).hexdigest()


def analyze(
    *,
    pdf_bytes: bytes,
    jd_text: str,
    enable_llm: bool = True,
) -> dict[str, Any]:
    """Run the full analysis pipeline and return a JSON-ready dict."""
    started = time.perf_counter()
    logger.info("analysis_start", jd_len=len(jd_text), pdf_size=len(pdf_bytes))

    parsed = parse_pdf(pdf_bytes)
    embedder = get_embedding_provider()

    scores = compute_scores(resume=parsed, jd_text=jd_text, embedder=embedder)

    matched_names = [s.name for s in scores.matched_skills]
    feedback_obj: dict[str, Any] | None = None
    suggested_bullets: list[str] | None = None
    llm_provider = None
    llm_model = None
    tokens_used = 0

    if enable_llm:
        try:
            llm = get_llm_client()
            system, user = build_feedback_prompt(
                jd_text=jd_text,
                resume_excerpts=scores.top_resume_excerpts,
                matched_skills=matched_names,
                missing_skills=scores.missing_skills,
                overall_score=scores.overall,
                semantic_score=scores.semantic,
                skill_score=scores.skill,
                experience_score=scores.experience,
                original_bullets=parsed.bullets,
            )
            resp = llm.complete(system=system, user=user, json_mode=True)
            feedback_obj = _safe_parse_json(resp.text)
            llm_provider = resp.provider
            llm_model = resp.model
            tokens_used = resp.total_tokens
            # Pull bullet rewrites
            rewrites = feedback_obj.get("rewritten_bullets") or []
            suggested_bullets = [
                r["rewritten"] for r in rewrites if isinstance(r, dict) and r.get("rewritten")
            ]
        except Exception as exc:  # pragma: no cover
            logger.exception("llm_feedback_failed", error=str(exc))
            feedback_obj = {
                "summary": "LLM feedback unavailable; ML scores are still valid.",
                "strengths": [],
                "gaps": [],
                "ats_warnings": [],
                "seniority_fit": "unknown",
                "recommended_keywords": scores.missing_skills[:10],
            }

    duration_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "analysis_done",
        overall=scores.overall,
        duration_ms=duration_ms,
        llm_provider=llm_provider,
        tokens=tokens_used,
    )

    return {
        "overall_score": scores.overall,
        "semantic_score": scores.semantic,
        "skill_score": scores.skill,
        "experience_score": scores.experience,
        "matched_skills": matched_names,
        "missing_skills": scores.missing_skills,
        "section_breakdown": scores.section_scores,
        "llm_feedback": feedback_obj,
        "suggested_bullets": suggested_bullets,
        "llm_provider": llm_provider,
        "llm_model": llm_model,
        "tokens_used": tokens_used,
        "duration_ms": duration_ms,
        "prompt_version": PROMPT_VERSION,
        "page_count": parsed.page_count,
    }
