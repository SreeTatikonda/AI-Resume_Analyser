# Contributing Guide

Thank you for taking the time to contribute to AI Resume Analyser Pro. This guide covers everything you need to get a development environment running, write and test code, and open a pull request.

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) Code of Conduct. Be respectful and constructive.

---

## Getting Started

### Fork and clone

```bash
git clone https://github.com/<your-username>/ai-resume-analyser-pro.git
cd ai-resume-analyser-pro
git remote add upstream https://github.com/sree-tatikonda/ai-resume-analyser-pro.git
```

### Start the local stack

```bash
cp backend/.env.example backend/.env
# (Optional) Set OPENAI_API_KEY for cloud LLM; leave LLM_PROVIDER=local otherwise
docker-compose up -d
```

Services: API on `:8000`, Frontend on `:5173`, Prometheus `:9090`, Grafana `:3001`.

### Backend development (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

# Run database migrations
alembic upgrade head

# Start the dev server (auto-reload)
./scripts/run_dev.sh
```

### Frontend development (without Docker)

```bash
cd frontend
npm ci
npm run dev   # Vite dev server on :5173 with API proxy to :8000
```

---

## Branch Naming

| Type | Pattern | Example |
| --- | --- | --- |
| Feature | `feat/<short-description>` | `feat/pgvector-store` |
| Bug fix | `fix/<issue-or-description>` | `fix/pdf-unicode-crash` |
| Chore / tech-debt | `chore/<description>` | `chore/update-fastapi-0116` |
| Documentation | `docs/<description>` | `docs/add-ml-pipeline-doc` |
| Hotfix | `hotfix/<description>` | `hotfix/critical-auth-bypass` |

Branch from `develop` for features; branch from `main` for hotfixes.

---

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[body — optional, wraps at 72 chars]

[footer — issue refs, breaking changes]
```

**Types**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`, `style`

**Examples**:

```
feat(analyzer): add pgvector backend for FAISS replacement

Implements VectorStoreBase for pgvector, adds migration for
the embeddings table, and switches the factory when
VECTOR_STORE=pgvector is set.

Closes #42
```

```
fix(pdf_parser): handle multi-column PDFs with sort=True

PyMuPDF's get_text("blocks") returns blocks in DOM order for
multi-column layouts. Enabling sort=True restores reading order.

Fixes #87
```

---

## Code Quality

### Backend (Python)

All Python code is checked with **ruff** (lint + format) and **mypy** (strict types).

```bash
cd backend

# Lint
ruff check .

# Format check
ruff format --check .

# Type check
mypy app/

# Auto-fix what ruff can fix
ruff check --fix . && ruff format .
```

Configuration lives in `backend/pyproject.toml`. Ruff rules in use: `E, F, W, I, N, UP, B, C4, SIM, RUF`.

### Frontend (TypeScript)

```bash
cd frontend

# ESLint
npm run lint

# TypeScript compiler (type errors only)
npm run type-check

# Auto-fix ESLint
npm run lint -- --fix
```

---

## Running Tests

### All tests

```bash
cd backend
pytest --cov=app --cov-report=term-missing
```

### Unit tests only (no external services required)

```bash
pytest tests/unit/ -v
```

### Integration tests (require running postgres + redis)

Start services first:

```bash
docker-compose up -d db redis
```

Then:

```bash
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/resume_analyser_test \
REDIS_URL=redis://localhost:6379/0 \
APP_ENV=test \
pytest tests/integration/ -v
```

### Coverage threshold

The CI enforces `--cov-fail-under=70`. Aim to keep coverage above this for new code:

```bash
pytest --cov=app --cov-fail-under=70
```

### Writing tests

- **Unit tests** go in `tests/unit/`. They must not require running services — mock database sessions and LLM clients.
- **Integration tests** go in `tests/integration/`. They use the real database and test the full HTTP stack via `httpx.AsyncClient`.
- Use `conftest.py` fixtures for database setup and test data.

```python
# Example: unit test for scorer
def test_composite_score_weights():
    from app.services.scoring.scorer import compute_overall_score
    score = compute_overall_score(semantic_score=80.0, skill_score=60.0, experience_score=70.0)
    expected = 0.5 * 80 + 0.3 * 60 + 0.2 * 70
    assert abs(score - expected) < 0.01
```

---

## Database Migrations

All schema changes must go through Alembic:

```bash
cd backend

# Auto-generate migration from model changes
alembic revision --autogenerate -m "add prompt_version column to analyses"

# Review the generated file in alembic/versions/ before applying
alembic upgrade head

# Roll back one step
alembic downgrade -1
```

**Rules**:
- Migrations must be backward-compatible (add columns with defaults, avoid DROP in prod).
- Never edit an already-applied migration; create a new one.
- Test both `upgrade` and `downgrade` paths.

---

## Pull Request Workflow

1. Create a feature branch from `develop`.
2. Make your changes with tests.
3. Ensure all checks pass locally: `ruff check . && mypy app/ && pytest`.
4. Push and open a PR against `develop`.
5. Fill out the PR template — especially the testing section.
6. At least one reviewer must approve.
7. PRs are squash-merged to keep a clean history.

**What the CI checks** (all must pass before merge):

- `backend-lint`: ruff + mypy
- `backend-test`: pytest with 70% coverage threshold
- `frontend-lint`: ESLint + tsc
- `frontend-build`: `npm run build` succeeds
- `helm-lint`: `helm lint` + `helm template` renders without errors
- `security`: Trivy FS scan — no critical vulnerabilities

---

## Adding a New API Endpoint

1. Add the route in the appropriate file under `backend/app/api/v1/`.
2. Define request/response schemas in `backend/app/schemas/`.
3. Add or extend service logic in `backend/app/services/`.
4. Write unit tests for the service and integration tests for the endpoint.
5. Update `docs/API.md` with request/response examples.
6. If the endpoint calls an LLM or does heavy work, consider adding a Celery task path.

---

## Debugging Tips

```bash
# View API logs in real time
docker-compose logs -f api

# Attach a debugger (ipdb) to the API process
# Set breakpoint: import ipdb; ipdb.set_trace()
# Then POST to the endpoint normally

# Inspect the database
docker-compose exec db psql -U postgres resume_analyser

# Check Celery worker status
docker-compose exec worker celery -A app.workers.celery_app inspect active

# Check Prometheus targets are UP
open http://localhost:9090/targets
```

---

## Release Process

Only maintainers cut releases:

```bash
# Bump version in backend/pyproject.toml + frontend/package.json
# Update CHANGELOG.md with the new version

git tag v1.2.0
git push origin v1.2.0
# GitHub Actions will: build → push ECR → deploy prod → create release
```
