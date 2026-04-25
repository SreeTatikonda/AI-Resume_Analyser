"""Local LLM stub returns valid JSON-shaped feedback."""
from __future__ import annotations

import json

from app.services.llm.local_client import LocalStubClient


def test_local_stub_returns_json_string() -> None:
    client = LocalStubClient()
    resp = client.complete(system="s", user="u", json_mode=True)
    payload = json.loads(resp.text)
    assert "summary" in payload
    assert "strengths" in payload
    assert "gaps" in payload
