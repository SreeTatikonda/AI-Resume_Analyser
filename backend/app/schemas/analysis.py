"""Analysis Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SkillMatch(BaseModel):
    skill: str
    category: str
    in_resume: bool
    in_jd: bool
    similarity: float = Field(ge=0.0, le=1.0)


class SectionScore(BaseModel):
    section: str
    score: float = Field(ge=0.0, le=100.0)
    evidence: list[str] = Field(default_factory=list)


class LLMFeedback(BaseModel):
    summary: str
    strengths: list[str]
    gaps: list[str]
    ats_warnings: list[str] = Field(default_factory=list)
    seniority_fit: str | None = None
    recommended_keywords: list[str] = Field(default_factory=list)


class AnalysisCreate(BaseModel):
    """Request body when JD is provided as JSON (file uploaded separately as multipart)."""

    job_description: str = Field(min_length=20, max_length=20_000)


class AnalysisSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    resume_filename: str
    overall_score: float | None
    status: str
    created_at: datetime


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: Literal["pending", "processing", "completed", "failed"]
    resume_filename: str

    overall_score: float | None = None
    semantic_score: float | None = None
    skill_score: float | None = None
    experience_score: float | None = None

    matched_skills: list[str] | None = None
    missing_skills: list[str] | None = None
    section_breakdown: dict | None = None
    llm_feedback: LLMFeedback | None = None
    suggested_bullets: list[str] | None = None

    llm_provider: str | None = None
    llm_model: str | None = None
    duration_ms: int | None = None
    error: str | None = None
    created_at: datetime
