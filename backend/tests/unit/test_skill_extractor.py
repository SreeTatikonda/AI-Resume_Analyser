"""Tests for skill extraction logic."""
from __future__ import annotations

from app.services.extraction.skill_extractor import extract_skills, normalize


def test_normalize_lowers_and_collapses() -> None:
    out = normalize("Python   /  Django\n\nFastAPI")
    assert "python" in out
    assert "django" in out
    assert "fastapi" in out


def test_extract_exact_match() -> None:
    text = "Built REST APIs with FastAPI and PostgreSQL"
    skills = {s.name for s in extract_skills(text)}
    assert "FastAPI" in skills
    assert "PostgreSQL" in skills
    assert "REST" in skills


def test_alias_resolution() -> None:
    text = "Strong with K8s, Postgres, and TS"
    names = {s.name for s in extract_skills(text)}
    assert "Kubernetes" in names
    assert "PostgreSQL" in names
    assert "TypeScript" in names


def test_no_false_positives_in_short_text() -> None:
    text = "Email: jane@example.com"
    skills = extract_skills(text)
    # Should not trigger spurious skill matches in trivial text
    assert all(s.confidence > 0.8 for s in skills)


def test_categories_attached() -> None:
    skills = extract_skills("Built ML models in PyTorch and deployed on AWS")
    by_name = {s.name: s for s in skills}
    assert by_name["PyTorch"].category == "Machine Learning & AI"
    assert by_name["AWS"].category == "Cloud & DevOps"
