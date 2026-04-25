"""Analyses endpoints — sync (small) + async (Celery) variants."""
from __future__ import annotations

from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.analysis import AnalysisResponse, AnalysisSummary
from app.services.ai.analyzer import analyze, hash_text
from app.utils.rate_limit import limiter

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze a resume against a job description (synchronous)",
)
@limiter.limit(f"{settings.RATE_LIMIT_ANALYZE_PER_MINUTE}/minute")
async def create_analysis(
    request: Request,
    file: UploadFile = File(..., description="Resume PDF"),
    job_description: str = Form(..., min_length=20, max_length=20_000),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
) -> AnalysisResponse:
    # Validate file type
    if file.content_type not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    pdf_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(pdf_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB")
    if len(pdf_bytes) < 100:
        raise HTTPException(status_code=400, detail="File appears empty")

    resume_hash = hash_text(pdf_bytes)
    jd_hash = hash_text(job_description.strip())

    record = Analysis(
        user_id=user.id if user else None,
        resume_filename=file.filename or "resume.pdf",
        resume_hash=resume_hash,
        jd_hash=jd_hash,
        jd_text=job_description,
        status="processing",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        result = analyze(pdf_bytes=pdf_bytes, jd_text=job_description)
        record.status = "completed"
        record.overall_score = result["overall_score"]
        record.semantic_score = result["semantic_score"]
        record.skill_score = result["skill_score"]
        record.experience_score = result["experience_score"]
        record.matched_skills = result["matched_skills"]
        record.missing_skills = result["missing_skills"]
        record.section_breakdown = result["section_breakdown"]
        record.llm_feedback = result["llm_feedback"]
        record.suggested_bullets = result["suggested_bullets"]
        record.llm_provider = result["llm_provider"]
        record.llm_model = result["llm_model"]
        record.tokens_used = result["tokens_used"]
        record.duration_ms = result["duration_ms"]
        db.commit()
        db.refresh(record)
    except Exception as exc:
        logger.exception("analysis_failed", error=str(exc))
        record.status = "failed"
        record.error = str(exc)[:1000]
        db.commit()
        raise HTTPException(status_code=500, detail="Analysis failed") from exc

    return AnalysisResponse.model_validate(record)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
) -> AnalysisResponse:
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    # If owned by a user, only that user can read
    if record.user_id and (not user or record.user_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return AnalysisResponse.model_validate(record)


@router.get("", response_model=list[AnalysisSummary])
def list_analyses(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
) -> list[Analysis]:
    q = db.query(Analysis)
    if user:
        q = q.filter(Analysis.user_id == user.id)
    else:
        # Guests can't list global history
        return []
    return q.order_by(Analysis.created_at.desc()).offset(offset).limit(min(limit, 100)).all()
