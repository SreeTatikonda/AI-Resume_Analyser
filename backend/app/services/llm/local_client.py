"""Stub LLM client used when no provider is configured.

Returns a deterministic, structured-but-plain feedback object so the rest of
the pipeline keeps working in offline / unit-test environments.
"""
from __future__ import annotations

import json

from app.services.llm.base import LLMClient, LLMResponse


class LocalStubClient(LLMClient):
    provider = "local"
    model = "stub"

    def complete(
        self,
        *,
        system: str,
        user: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        # Heuristic placeholder feedback. Real value comes from the ML signals.
        payload = {
            "summary": (
                "LLM provider not configured. The semantic and skill-overlap "
                "scores below come from the deterministic ML pipeline."
            ),
            "strengths": ["Hands-on engineering experience detected in resume"],
            "gaps": ["Connect an LLM (OpenAI / Bedrock) for tailored suggestions"],
            "ats_warnings": [],
            "seniority_fit": "unknown",
            "recommended_keywords": [],
            "rewritten_bullets": [],
        }
        text = json.dumps(payload) if json_mode else json.dumps(payload, indent=2)
        return LLMResponse(text=text, model=self.model, provider=self.provider)
