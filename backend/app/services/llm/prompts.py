"""Prompt templates with explicit versioning.

Versioning the prompts lets you A/B test, roll back, and correlate evaluation
metrics with the prompt that produced them.
"""
from __future__ import annotations

PROMPT_VERSION = "v1.2.0"

FEEDBACK_SYSTEM = """\
You are a senior technical recruiter and resume coach who has hired engineers \
at top tech companies. You write actionable, concise feedback grounded only in \
the evidence provided. You never invent skills or experience. Output STRICT \
JSON matching the schema given by the user — no markdown, no commentary.\
"""

FEEDBACK_USER_TEMPLATE = """\
You will receive:
1) A job description (JD).
2) Selected resume excerpts most relevant to the JD (already retrieved).
3) Skill overlap data (matched and missing skills).
4) Quantitative scores from a separate ML pipeline.

Your job is to produce structured feedback that helps the candidate tailor \
the resume to the JD. Use ONLY the provided evidence — do NOT invent skills, \
companies, or experience.

Return JSON exactly matching this schema:
{{
  "summary": "<2-3 sentence overall fit assessment>",
  "strengths": ["<concrete strength grounded in resume>", ...],
  "gaps": ["<concrete gap with action>", ...],
  "ats_warnings": ["<ATS / formatting issues you can infer>", ...],
  "seniority_fit": "<below | aligned | above | unknown>",
  "recommended_keywords": ["<keyword from JD missing in resume>", ...],
  "rewritten_bullets": [
    {{"original": "<original bullet>", "rewritten": "<stronger, quantified, JD-aligned version>"}},
    ...
  ]
}}

=== JOB DESCRIPTION ===
{jd_text}

=== TOP RESUME EXCERPTS (retrieved by semantic search) ===
{resume_excerpts}

=== SKILL OVERLAP ===
Matched skills ({n_matched}): {matched_skills}
Missing skills ({n_missing}): {missing_skills}

=== ML SCORES (0-100) ===
Overall: {overall_score} | Semantic: {semantic_score} | Skill: {skill_score} | Experience: {experience_score}

=== ORIGINAL RESUME BULLETS (top 8 by length) ===
{original_bullets}

Return JSON only.\
"""


def build_feedback_prompt(
    *,
    jd_text: str,
    resume_excerpts: list[str],
    matched_skills: list[str],
    missing_skills: list[str],
    overall_score: float,
    semantic_score: float,
    skill_score: float,
    experience_score: float,
    original_bullets: list[str],
) -> tuple[str, str]:
    """Return (system, user) prompts."""
    excerpts = "\n---\n".join(f"- {e}" for e in resume_excerpts[:8]) or "(none)"
    bullets = "\n".join(f"- {b}" for b in original_bullets[:8]) or "(none)"
    user = FEEDBACK_USER_TEMPLATE.format(
        jd_text=jd_text[:4000],
        resume_excerpts=excerpts,
        n_matched=len(matched_skills),
        n_missing=len(missing_skills),
        matched_skills=", ".join(matched_skills[:40]) or "(none)",
        missing_skills=", ".join(missing_skills[:40]) or "(none)",
        overall_score=round(overall_score, 1),
        semantic_score=round(semantic_score, 1),
        skill_score=round(skill_score, 1),
        experience_score=round(experience_score, 1),
        original_bullets=bullets,
    )
    return FEEDBACK_SYSTEM, user
