"""Application configuration via pydantic-settings.

All settings are read from environment variables. Defaults are dev-friendly,
production deployments must override secrets via Kubernetes Secrets / AWS
Secrets Manager.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Top-level application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    APP_NAME: str = "AI Resume Analyser"
    APP_ENV: Literal["dev", "staging", "prod", "test"] = "dev"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # ---- Security ----
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ---- Database (PostgreSQL) ----
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/resume_analyser"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ---- Redis / Celery ----
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ---- Object storage (S3) ----
    S3_BUCKET: str = "ai-resume-analyser-dev"
    S3_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: str | None = None  # for MinIO local dev

    # ---- LLM provider (pluggable) ----
    LLM_PROVIDER: Literal["openai", "bedrock", "local"] = "openai"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 1500
    LLM_TIMEOUT_SECONDS: int = 60
    EMBEDDING_PROVIDER: Literal["openai", "bedrock", "local"] = "local"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # OpenAI
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str | None = None  # for Azure / proxies

    # Bedrock
    AWS_REGION: str = "us-east-1"
    BEDROCK_LLM_MODEL_ID: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    BEDROCK_EMBEDDING_MODEL_ID: str = "amazon.titan-embed-text-v2:0"

    # ---- Vector store ----
    VECTOR_STORE: Literal["faiss", "pgvector"] = "faiss"
    FAISS_INDEX_PATH: str = "/tmp/faiss_index"

    # ---- Rate limiting ----
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_ANALYZE_PER_MINUTE: int = 10

    # ---- Observability ----
    OTEL_ENABLED: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: str | None = None
    OTEL_SERVICE_NAME: str = "resume-analyser-api"
    PROMETHEUS_ENABLED: bool = True

    # ---- File upload ----
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: list[str] = ["application/pdf"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: object) -> list[str] | object:
        if isinstance(v, str):
            if v.startswith("["):
                return v
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere."""
    return Settings()


settings = get_settings()
