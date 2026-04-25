# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Async Celery path for `POST /analyses` via `?async=true`
- pgvector backend replacing FAISS for cross-request persistence
- Streaming LLM response via Server-Sent Events
- Multi-resume batch comparison endpoint
- Interview question generation from skill gaps
- OpenTelemetry distributed tracing (Jaeger / Grafana Tempo)
- MCP (Model Context Protocol) server tool

---

## [1.0.0] - 2026-04-25

### Added

**Core ML Pipeline**
- Hybrid skill extraction: curated taxonomy (3 000+ skills), alias expansion, and RapidFuzz fuzzy matching (WRatio ≥ 85)
- Sentence-transformer semantic embeddings (all-MiniLM-L6-v2 local; Titan Embed v2 / text-embedding-3-small cloud)
- FAISS in-process vector store with S3 persistence
- RAG-grounded LLM feedback: top-k JD chunk retrieval injected as context into LLM prompt
- Weighted composite scoring: `overall = 0.50 × semantic + 0.30 × skill + 0.20 × experience`
- ATS keyword gap detection and recommended keyword list
- AI-generated resume bullet suggestions tailored to the JD

**API (FastAPI)**
- `POST /api/v1/analyses` — synchronous resume analysis (multipart/form-data)
- `GET /api/v1/analyses/{id}` — retrieve analysis by UUID
- `GET /api/v1/analyses` — list authenticated user's analyses
- `POST /api/v1/auth/register` — user registration
- `POST /api/v1/auth/login` — JWT token issuance
- `GET /api/v1/auth/me` — current user profile
- `GET /api/v1/healthz` — liveness probe
- `GET /api/v1/readyz` — readiness probe (DB + Redis)
- `GET /metrics` — Prometheus exposition endpoint
- Guest mode: analyses without authentication, scoped to session

**Pluggable LLM Backend**
- OpenAI GPT-4o-mini support
- Amazon Bedrock Claude 3.5 Sonnet support
- Local/Ollama support for air-gapped deployments
- Strategy pattern factory — switch provider by env var with zero code change

**Async Pipeline (Celery)**
- Celery worker with Redis broker for async analysis tasks
- Separate `Dockerfile.worker` for worker image
- `run_worker.sh` entrypoint with concurrency configuration

**Security**
- JWT HS256 authentication with 24h expiry
- bcrypt password hashing (cost factor 12)
- Per-IP rate limiting (slowapi + Redis): 10 req/min on analyze, 60 req/min otherwise
- Non-root container user (`app:app`)
- File type enforcement (PDF only) and size cap (10 MB)
- CORS restricted to configured origins
- Prompt injection defensive instructions in system prompt

**Observability**
- Prometheus metrics: `http_requests_total`, `http_request_duration_seconds`, `analysis_duration_seconds`, `llm_tokens_total{kind=prompt|completion}`, `analysis_failures_total`
- `RequestContextMiddleware` — per-request latency timing, request ID injection
- Structlog JSON logging with `request_id`, `method`, `path`, `status_code`, `duration_ms`
- OpenTelemetry opt-in (`OTEL_ENABLED=true`) via FastAPI instrumentation
- 21-panel Grafana dashboard (auto-provisioned): RPS, error rate, latency p50/p95/p99, analysis duration, LLM token usage by provider, queue depth, CPU/memory, status breakdown
- 12 Prometheus alert rules: HighErrorRate, HighLatencyP95/P99, AnalysisFailures, LLMTokenSpike, LLMProviderTimeout, WorkerQueueGrowing/Critical, PodCrashLooping, PodNotReady, HighMemory, HighCPU

**Infrastructure**
- Docker multi-stage builds (builder → runtime) for API, Worker, and Frontend
- Helm chart with per-environment values files (dev, staging, prod)
- Kustomize overlays in `k8s/`
- Terraform modules for EKS, RDS (PostgreSQL 16), ElastiCache (Redis 7), ECR, S3, IAM OIDC
- Terraform environments: `envs/dev` and `envs/prod`

**CI/CD (GitHub Actions)**
- `ci.yml`: parallel jobs — backend-lint (ruff + mypy), backend-test (pytest + coverage upload), frontend-lint (ESLint + tsc), frontend-build (Vite + artifact upload), helm-lint, terraform-validate (dev + prod), security (Trivy SARIF)
- `build-and-push.yml`: matrix build (api, worker, frontend) → ECR push with SHA/branch/version tags; Trivy image scan blocking on HIGH/CRITICAL; GHA layer cache
- `deploy.yml`: manual workflow_dispatch (dev/staging/prod) + auto on version tag; Helm upgrade --install --atomic; Helm test; Slack notification
- `release.yml`: auto GitHub Release with commit changelog on version tag
- `dependabot.yml`: weekly updates for pip, npm, github-actions, terraform, docker
- CODEOWNERS, PR template, bug/feature issue templates, SECURITY.md

**Documentation**
- `README.md`: hero badges, TL;DR, Mermaid C4 architecture diagram, feature list, tech stack table, project structure tree, quickstart, configuration table, API examples (curl + Python + JS), deployment summary, observability reference, testing guide, senior portfolio highlights, roadmap
- `docs/ARCHITECTURE.md`: system diagram, request data flow, ML pipeline diagram, technology rationale, scaling strategy, failure modes
- `docs/DEPLOYMENT.md`: Terraform bootstrap, ECR build script, secrets management (ESO + Sealed Secrets), EKS kubeconfig, Helm install, DNS/ACM, smoke tests, Helm test, rollback procedure, environment matrix
- `docs/API.md`: full endpoint reference with request/response examples, auth flow, rate limits, error schema, Python SDK example
- `docs/ML.md`: pipeline stages (PDF parsing, hybrid skill extraction, embeddings, semantic scoring, RAG retrieval, weighted scoring, LLM feedback), evaluation strategy with planned harness, extension guide
- `docs/CONTRIBUTING.md`: dev workflow, branch naming, commit style, code quality, test strategy, database migrations, PR workflow, debugging tips
- `docs/SECURITY.md`: supply-chain (Trivy, SBOM, cosign), secrets management (ESO + Secrets Manager), IAM least-privilege, network policies, TLS, application security, monitoring
- `docs/diagrams/architecture.mmd`: Mermaid C4Context source
- `docs/diagrams/sequence-analyze.mmd`: Mermaid sequence diagram for analyze request
- `CHANGELOG.md`: Keep a Changelog format
- `LICENSE`: MIT 2026

### Changed
- N/A (initial release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

[Unreleased]: https://github.com/sree-tatikonda/ai-resume-analyser-pro/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sree-tatikonda/ai-resume-analyser-pro/releases/tag/v1.0.0
