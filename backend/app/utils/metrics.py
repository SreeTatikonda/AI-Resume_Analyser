"""Prometheus metrics — request counters, latency histograms, LLM token usage."""
from __future__ import annotations

from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0),
)

ANALYSIS_DURATION = Histogram(
    "analysis_duration_seconds",
    "End-to-end resume analysis duration",
    ["llm_provider"],
    buckets=(0.5, 1.0, 2.5, 5.0, 10.0, 20.0, 30.0, 60.0, 120.0),
)

LLM_TOKENS = Counter(
    "llm_tokens_total",
    "LLM tokens consumed",
    ["provider", "model", "kind"],  # kind = prompt | completion
)

ANALYSIS_FAILURES = Counter(
    "analysis_failures_total",
    "Resume analysis failures",
    ["reason"],
)
