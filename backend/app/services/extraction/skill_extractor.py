"""Hybrid skill extractor: exact match + alias resolution + fuzzy matching.

This combines high-recall lexical matching with fuzzy matching for typo /
variant tolerance, and is the foundation for the skill score component.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from rapidfuzz import fuzz

from app.services.extraction.taxonomy import (
    ALIASES,
    ALL_SKILLS,
    SKILL_TO_CATEGORY,
)


@dataclass(frozen=True)
class ExtractedSkill:
    name: str  # canonical skill name
    category: str
    confidence: float  # 0..1
    method: str  # "exact" | "alias" | "fuzzy"


def normalize(text: str) -> str:
    """Lowercase + collapse whitespace + strip noisy punctuation, keep + and #."""
    text = text.lower()
    text = re.sub(r"[\/\-–—_]+", " ", text)
    text = re.sub(r"[^a-z0-9+#\s\.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _exact_and_alias(text_normalized: str) -> dict[str, ExtractedSkill]:
    """Find exact + alias matches with word-boundary regex."""
    found: dict[str, ExtractedSkill] = {}

    # Exact canonical names
    for skill in ALL_SKILLS:
        safe = re.escape(skill.lower())
        if re.search(rf"(?<!\w){safe}(?!\w)", text_normalized):
            found[skill] = ExtractedSkill(
                name=skill,
                category=SKILL_TO_CATEGORY.get(skill, "Other"),
                confidence=1.0,
                method="exact",
            )

    # Aliases
    for alias, canonical in ALIASES.items():
        if canonical in found:
            continue
        safe = re.escape(alias.lower())
        if re.search(rf"(?<!\w){safe}(?!\w)", text_normalized):
            found[canonical] = ExtractedSkill(
                name=canonical,
                category=SKILL_TO_CATEGORY.get(canonical, "Other"),
                confidence=0.95,
                method="alias",
            )

    return found


def _fuzzy(text: str, already_found: set[str], threshold: int = 90) -> dict[str, ExtractedSkill]:
    """Token-level fuzzy match for skills not yet found.

    Only considers multi-character skills to avoid false positives. Threshold
    is conservative (90) to keep precision high.
    """
    found: dict[str, ExtractedSkill] = {}
    tokens = set(text.split())

    candidates = [s for s in ALL_SKILLS if s not in already_found and len(s) >= 4]

    for skill in candidates:
        skill_lc = skill.lower()
        # Sliding window over tokens for multi-word skills
        if " " in skill_lc:
            n = skill_lc.count(" ") + 1
            words = text.split()
            for i in range(len(words) - n + 1):
                window = " ".join(words[i : i + n])
                score = fuzz.ratio(window, skill_lc)
                if score >= threshold:
                    found[skill] = ExtractedSkill(
                        name=skill,
                        category=SKILL_TO_CATEGORY.get(skill, "Other"),
                        confidence=score / 100.0,
                        method="fuzzy",
                    )
                    break
        else:
            for token in tokens:
                if abs(len(token) - len(skill_lc)) > 3:
                    continue
                score = fuzz.ratio(token, skill_lc)
                if score >= threshold:
                    found[skill] = ExtractedSkill(
                        name=skill,
                        category=SKILL_TO_CATEGORY.get(skill, "Other"),
                        confidence=score / 100.0,
                        method="fuzzy",
                    )
                    break

    return found


def extract_skills(text: str, *, fuzzy: bool = True) -> list[ExtractedSkill]:
    """Extract skills from arbitrary text using the hybrid pipeline."""
    if not text:
        return []
    norm = normalize(text)
    found = _exact_and_alias(norm)
    if fuzzy:
        found.update(_fuzzy(norm, set(found.keys())))
    return sorted(found.values(), key=lambda s: (-s.confidence, s.name))
