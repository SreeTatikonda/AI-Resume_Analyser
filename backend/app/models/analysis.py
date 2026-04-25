"""Analysis ORM model — stores each resume × JD analysis result."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.session import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Inputs (truncated/hashed for privacy)
    resume_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    resume_s3_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    resume_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    jd_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    jd_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scores
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    semantic_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    skill_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    experience_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Detailed results
    matched_skills: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    missing_skills: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    section_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    llm_feedback: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    suggested_bullets: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    llm_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
