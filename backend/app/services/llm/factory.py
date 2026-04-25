"""LLM client factory — driven by LLM_PROVIDER setting."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.core.logging import get_logger
from app.services.llm.base import LLMClient

logger = get_logger(__name__)


@lru_cache
def get_llm_client() -> LLMClient:
    provider = settings.LLM_PROVIDER

    try:
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                logger.warning("openai_key_missing_falling_back_to_stub")
                from app.services.llm.local_client import LocalStubClient
                return LocalStubClient()
            from app.services.llm.openai_client import OpenAIClient
            return OpenAIClient()
        if provider == "bedrock":
            from app.services.llm.bedrock_client import BedrockClient
            return BedrockClient()
    except Exception as exc:  # pragma: no cover
        logger.exception("llm_client_init_failed", error=str(exc))

    from app.services.llm.local_client import LocalStubClient
    return LocalStubClient()
