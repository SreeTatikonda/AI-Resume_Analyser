"""Liveness + readiness endpoints used by Kubernetes probes and load balancers."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get("/healthz", status_code=status.HTTP_200_OK)
def liveness() -> dict[str, str]:
    """Simple liveness probe — does the app respond at all."""
    return {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}


@router.get("/readyz", status_code=status.HTTP_200_OK)
def readiness(db: Session = Depends(get_db)) -> dict[str, object]:
    """Readiness probe — verify DB and downstream dependencies are reachable."""
    checks: dict[str, str] = {}
    overall_ok = True

    # DB
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:  # pragma: no cover
        checks["database"] = f"error: {exc.__class__.__name__}"
        overall_ok = False

    # Redis (best effort)
    try:
        import redis  # type: ignore

        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"degraded: {exc.__class__.__name__}"

    return {"status": "ok" if overall_ok else "degraded", "checks": checks}
