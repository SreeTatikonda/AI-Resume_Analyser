"""Smoke test: the app boots and the root + healthz endpoints respond."""
from __future__ import annotations


def test_root(client) -> None:
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["docs"] == "/docs"


def test_liveness(client) -> None:
    r = client.get("/api/v1/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
