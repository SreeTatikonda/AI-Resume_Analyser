"""Amazon Bedrock LLM client (Anthropic Claude messages API)."""
from __future__ import annotations

import json

from app.core.config import settings
from app.services.llm.base import LLMClient, LLMResponse


class BedrockClient(LLMClient):
    provider = "bedrock"

    def __init__(self, model_id: str | None = None) -> None:
        import boto3  # lazy

        self.model = model_id or settings.BEDROCK_LLM_MODEL_ID
        self.client = boto3.client("bedrock-runtime", region_name=settings.AWS_REGION)

    def complete(
        self,
        *,
        system: str,
        user: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> LLMResponse:
        # Anthropic messages API on Bedrock
        prompt_user = user + ("\n\nReturn ONLY a JSON object." if json_mode else "")
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens or settings.LLM_MAX_TOKENS,
            "temperature": temperature if temperature is not None else settings.LLM_TEMPERATURE,
            "system": system,
            "messages": [{"role": "user", "content": prompt_user}],
        }
        resp = self.client.invoke_model(modelId=self.model, body=json.dumps(body))
        payload = json.loads(resp["body"].read())
        text = "".join(part.get("text", "") for part in payload.get("content", []))
        usage = payload.get("usage", {}) or {}
        return LLMResponse(
            text=text,
            model=self.model,
            provider=self.provider,
            prompt_tokens=usage.get("input_tokens", 0) or 0,
            completion_tokens=usage.get("output_tokens", 0) or 0,
            total_tokens=(usage.get("input_tokens", 0) or 0) + (usage.get("output_tokens", 0) or 0),
        )
