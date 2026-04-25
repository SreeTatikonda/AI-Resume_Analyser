"""Async analysis task — runs the same pipeline on a worker."""
from __future__ import annotations

from uuid import UUID

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.analysis import Analysis
from app.services.ai.analyzer import analyze
from app.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(bind=True, name="analyze_resume", max_retries=2, default_retry_delay=10)
def analyze_resume_task(self, analysis_id: str, pdf_bytes_b64: str, jd_text: str) -> str:
    import base64

    pdf_bytes = base64.b64decode(pdf_bytes_b64)
    db = SessionLocal()
    try:
        record = db.query(Analysis).filter(Analysis.id == UUID(analysis_id)).first()
        if not record:
            logger.error("analysis_not_found", id=analysis_id)
            return "not_found"
        record.status = "processing"
        db.commit()

        result = analyze(pdf_bytes=pdf_bytes, jd_text=jd_text)

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
        return "completed"
    except Exception as exc:
        logger.exception("worker_analysis_failed", error=str(exc))
        try:
            record.status = "failed"  # type: ignore[possibly-undefined]
            record.error = str(exc)[:1000]
            db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()
