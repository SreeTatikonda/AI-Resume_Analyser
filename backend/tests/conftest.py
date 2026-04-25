"""pytest fixtures — kept lazy so unit tests can run without DB/web stack installed."""
from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("LLM_PROVIDER", "local")
os.environ.setdefault("EMBEDDING_PROVIDER", "local")
os.environ.setdefault("PROMETHEUS_ENABLED", "false")

import pytest


@pytest.fixture
def client():
    """Boots the full FastAPI app — requires SQLAlchemy + FastAPI installed."""
    from fastapi.testclient import TestClient

    from app.main import create_app

    app = create_app()
    return TestClient(app)
