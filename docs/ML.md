# ML Pipeline Documentation

This document explains the AI/ML pipeline powering resume analysis: how each stage works, why specific algorithms were chosen, and how to evaluate and extend the system.

---

## Pipeline Overview

```
Resume PDF  ──►  PDF Parser  ──►  Skill Extractor  ──►  Embedding Service
                                                               │
Job Description  ──────────────────────────────────────────►  │
                                                               ▼
                                                     Semantic Scorer
                                                               │
                                                     Vector Store (RAG)
                                                               │
                                                     Weighted Composite Scorer
                                                               │
                                                     LLM Feedback Generator
                                                               │
                                                     AnalysisResponse
```

Entry point: `backend/app/services/ai/analyzer.py::analyze()`

---

## Stage 1: PDF Parsing (`services/extraction/pdf_parser.py`)

**Library**: PyMuPDF (`fitz`) with pdfplumber fallback for scanned/complex layouts.

**What it does**:
1. Extract raw text page-by-page, preserving reading order.
2. Detect section boundaries using a heading regex (`^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SUMMARY|OBJECTIVE)\s*$`, case-insensitive, anchored to line start after newline normalisation).
3. Return `{"text": "...", "sections": {"experience": "...", "skills": "...", ...}}`.

**Edge cases handled**:
- Multi-column PDFs: PyMuPDF's `sort=True` flag on `get_text("blocks")` handles column order.
- Tables: treated as inline text; structured extraction is a roadmap item.
- Scanned/image PDFs: fallback returns empty text → `400 Bad Request` with suggestion to use a text-based PDF.
- Unicode ligatures (ﬁ, ﬂ): normalized via `unicodedata.normalize("NFKD")`.

---

## Stage 2: Hybrid Skill Extraction (`services/extraction/skill_extractor.py`)

The extractor runs in three sequential stages on both the resume text and the JD text.

### 2a. Taxonomy Lookup

**Source**: A curated JSON file (`services/extraction/taxonomy.py`) of 3 000+ skills mapped to categories, derived from ESCO (European Skills, Competences, Qualifications and Occupations) and O*NET, extended with modern SWE/ML/cloud skills.

**Matching**: Trie-based lookup on lowercased, whitespace-normalised tokens. O(n) over tokens where n = word count.

```python
TAXONOMY = {
    "python": {"canonical": "Python", "category": "languages"},
    "fastapi": {"canonical": "FastAPI", "category": "frameworks"},
    "kubernetes": {"canonical": "Kubernetes", "category": "infrastructure"},
    # …3000+ entries
}
```

### 2b. Alias Expansion

Common abbreviations and informal names are resolved before taxonomy lookup:

```python
ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "k8s": "kubernetes",
    "tf": "terraform",
    "pg": "postgresql",
    "ml": "machine learning",
    "nlp": "natural language processing",
    # …200+ aliases
}
```

### 2c. Fuzzy Matching (RapidFuzz)

After exact taxonomy lookup, the remaining unmatched tokens are compared against all taxonomy keys using `rapidfuzz.fuzz.WRatio`. Skills with score ≥ 85 are accepted as matches.

```python
from rapidfuzz import fuzz, process

matches = process.extractBests(
    query=token,
    choices=TAXONOMY.keys(),
    scorer=fuzz.WRatio,
    score_cutoff=85,
    limit=1,
)
```

**Threshold rationale**: WRatio 85 catches `"PostgresQL"` → `"postgresql"` (typo) and `"React.js"` → `"react"` (suffix) without matching semantically distinct skills like `"Python"` → `"Cython"` (WRatio ≈ 78).

### Output

```python
SkillMatch(
    skill="FastAPI",
    category="frameworks",
    in_resume=True,
    in_jd=True,
    similarity=1.0,
)
```

`matched_skills` = skills present in both.  
`missing_skills` = skills in JD but absent from resume.

---

## Stage 3: Embeddings (`services/ai/embeddings.py`)

### Provider Selection

| `EMBEDDING_PROVIDER` | Model | Dimension | Latency (CPU) | Cost |
| --- | --- | --- | --- | --- |
| `local` (default) | `sentence-transformers/all-MiniLM-L6-v2` | 384 | ~40 ms/chunk | Free |
| `openai` | `text-embedding-3-small` | 1536 | ~150 ms (network) | $0.00002/1K tokens |
| `bedrock` | `amazon.titan-embed-text-v2:0` | 1024 | ~200 ms (network) | $0.0002/1K tokens |

All providers implement `EmbeddingBase.embed(texts: list[str]) -> np.ndarray`.

### Chunking Strategy

Text is split into overlapping windows of 512 tokens (50-token overlap) using a simple whitespace tokeniser:

```python
def chunk_text(text: str, max_tokens: int = 512, overlap: int = 50) -> list[str]:
    tokens = text.split()
    chunks = []
    for i in range(0, len(tokens), max_tokens - overlap):
        chunks.append(" ".join(tokens[i : i + max_tokens]))
        if i + max_tokens >= len(tokens):
            break
    return chunks
```

Overlap prevents skill phrases that span chunk boundaries from being missed.

---

## Stage 4: Semantic Scoring (`services/scoring/scorer.py`)

Semantic similarity is computed as the **max-pooled mean** of the pairwise cosine similarity matrix between resume and JD chunk embeddings:

```python
import numpy as np

def semantic_score(resume_embs: np.ndarray, jd_embs: np.ndarray) -> float:
    # L2-normalise
    r = resume_embs / np.linalg.norm(resume_embs, axis=1, keepdims=True)
    j = jd_embs / np.linalg.norm(jd_embs, axis=1, keepdims=True)
    # Pairwise cosine similarity matrix [n_resume_chunks × n_jd_chunks]
    sim_matrix = r @ j.T
    # For each JD chunk, take the best-matching resume chunk; then average
    return float(np.mean(np.max(sim_matrix, axis=0))) * 100
```

**Why max-pooling per JD chunk?** A JD requirement that matches *any* part of the resume should contribute positively, regardless of where in the resume it appears. Straight mean-pooling would penalise long resumes.

---

## Stage 5: RAG Retrieval (`services/ai/vector_store.py`)

**Purpose**: Retrieve the 5 JD chunks most semantically similar to the overall resume embedding to provide *grounded context* to the LLM. This reduces hallucination risk by limiting feedback to language and requirements actually present in the JD.

```python
context_chunks = vector_store.similarity_search(
    query_embedding=resume_emb,
    k=5,
)
# context_chunks: list[str] injected into the LLM prompt
```

**Store**:
- `VECTOR_STORE=faiss` (default): in-process FAISS `IndexFlatIP` (inner product on L2-normalised vectors ≡ cosine similarity). Index is built fresh per request for the JD chunks, then discarded. For JD chunk reuse across candidates, the index is persisted to S3.
- `VECTOR_STORE=pgvector`: uses `<->` cosine distance operator via SQLAlchemy; supports cross-request persistence and ACID guarantees.

---

## Stage 6: Weighted Composite Scoring

```python
def compute_overall_score(
    semantic_score: float,      # 0–100
    skill_score: float,         # 0–100
    experience_score: float,    # 0–100
) -> float:
    return (
        0.50 * semantic_score
        + 0.30 * skill_score
        + 0.20 * experience_score
    )
```

**Weight rationale**:

| Component | Weight | Rationale |
| --- | --- | --- |
| `semantic_score` | 50 % | Captures phrasing variance, contextual relevance, and holistic fit |
| `skill_score` | 30 % | Objective, auditable; high-signal for ATS keyword matching |
| `experience_score` | 20 % | Heuristic (section length, year ranges) — noisier than the others |

**Experience scoring heuristic**: Years of experience extracted from patterns `(20\d{2})\s*[-–]\s*(20\d{2}|present)` in the experience section; scaled linearly against JD's minimum requirement (extracted from patterns `\d+\+?\s*years?`).

---

## Stage 7: LLM Feedback (`services/llm/`, `services/llm/prompts.py`)

### Prompt Version: v2

The system prompt establishes the LLM as a senior technical recruiter with specific output format instructions:

```python
SYSTEM_PROMPT_V2 = """You are a senior technical recruiter and career coach.
You will receive:
1. A candidate's resume text
2. A job description
3. Pre-computed scores (semantic, skill, experience)
4. Relevant JD context chunks (retrieved via semantic search)

Your task: produce structured JSON feedback strictly grounded in the provided context.
Do NOT invent skills or requirements not present in the JD or resume.

Output JSON schema:
{
  "summary": "string (2–3 sentences)",
  "strengths": ["string", ...],   // 2–5 items
  "gaps": ["string", ...],        // 2–5 items
  "ats_warnings": ["string", ...],// 0–3 items
  "seniority_fit": "string | null",
  "recommended_keywords": ["string", ...], // 3–7 items
  "suggested_bullets": ["string", ...]     // 2–3 resume bullet suggestions
}"""
```

### Provider Strategy Pattern

```python
# services/llm/factory.py
def get_llm_client(provider: str) -> LLMBase:
    match provider:
        case "openai":   return OpenAIClient()
        case "bedrock":  return BedrockClient()
        case "local":    return LocalClient()   # Ollama
        case _:          raise ValueError(f"Unknown provider: {provider}")
```

All clients implement `LLMBase.chat_complete(messages, temperature, max_tokens) -> str`.

### Token Accounting

```python
# After LLM call:
LLM_TOKENS.labels(provider=provider, model=model, kind="prompt").inc(prompt_tokens)
LLM_TOKENS.labels(provider=provider, model=model, kind="completion").inc(completion_tokens)
```

---

## Evaluation Strategy

### Current

Unit tests in `tests/unit/test_scoring.py` verify:
- Composite formula arithmetic
- Boundary conditions (score = 0, score = 100)
- Weight sum = 1.0

`tests/unit/test_skill_extractor.py` verifies:
- Exact taxonomy matches
- Alias resolution
- Fuzzy match at threshold 85 accepts, threshold 84 rejects

### Future Evaluation Harness

A rigorous offline evaluation requires a labeled dataset:

```
dataset/
├── resumes/          # 500 anonymised PDFs (consented)
├── job_descriptions/ # 100 real JDs
└── labels.json       # recruiter scores (1–10) per (resume, JD) pair
```

**Metrics to track**:

| Metric | Formula | Target |
| --- | --- | --- |
| Skill precision | `matched ∩ true_positives / matched` | ≥ 0.90 |
| Skill recall | `matched ∩ true_positives / all_true` | ≥ 0.85 |
| Score correlation (Pearson r) | `corr(model_score, recruiter_score)` | ≥ 0.70 |
| Score RMSE | `√mean((model - recruiter)²)` | ≤ 10 pts |
| LLM faithfulness | % feedback claims verifiable in JD/resume | ≥ 0.95 |

**Evaluation runner** (planned):

```python
# scripts/evaluate.py
from pathlib import Path
import json, numpy as np
from scipy.stats import pearsonr

labels = json.loads(Path("dataset/labels.json").read_text())
model_scores, recruiter_scores = [], []

for entry in labels:
    result = analyze(
        pdf_bytes=Path(f"dataset/resumes/{entry['resume']}").read_bytes(),
        jd_text=Path(f"dataset/job_descriptions/{entry['jd']}").read_text(),
    )
    model_scores.append(result["overall_score"])
    recruiter_scores.append(entry["recruiter_score"] * 10)  # normalise 1–10 → 10–100

r, p = pearsonr(model_scores, recruiter_scores)
rmse = np.sqrt(np.mean((np.array(model_scores) - np.array(recruiter_scores)) ** 2))
print(f"Pearson r={r:.3f} (p={p:.4f}), RMSE={rmse:.2f}")
```

### Prompt Versioning

Prompts are versioned in `services/llm/prompts.py` (`SYSTEM_PROMPT_V2`). The active version is logged at startup and stored in the `Analysis` record (future: `prompt_version` column). A/B testing between prompt versions can be driven by the `APP_ENV` setting or a feature flag.

---

## Extending the Pipeline

### Adding a new LLM provider

1. Create `services/llm/my_provider_client.py` implementing `LLMBase`.
2. Add the case to `factory.py`.
3. Add `MY_PROVIDER_API_KEY` to `Settings` in `core/config.py`.
4. Add the env var to `.env.example` and `docs/DEPLOYMENT.md`.

### Adding skills to the taxonomy

Edit `services/extraction/taxonomy.py`. The taxonomy file is validated at startup:

```python
assert all("canonical" in v and "category" in v for v in TAXONOMY.values()), \
    "Malformed taxonomy entry"
```

### Changing score weights

Update the constants in `services/scoring/scorer.py`. Run the evaluation harness to verify that the change improves correlation with recruiter scores before shipping.
