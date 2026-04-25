# API Reference

Base URL: `https://app.ai-resume-analyser.example.com/api/v1`  
Interactive docs: `/docs` (Swagger UI) · `/redoc` (ReDoc)  
OpenAPI schema: `/api/v1/openapi.json`

---

## Authentication

The API uses **JWT Bearer tokens** (HS256). Analyses can be submitted as a guest (no token) with results accessible only by the submitting session. Authenticated users can list their history.

```
Authorization: Bearer <access_token>
```

Tokens expire after **24 hours** (`ACCESS_TOKEN_EXPIRE_MINUTES = 1440`).

---

## Rate Limits

| Endpoint | Limit |
| --- | --- |
| `POST /analyses` | 10 requests / minute / IP |
| All other endpoints | 60 requests / minute / IP |

Rate-limit responses:

```
HTTP 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
Retry-After: 42
```

---

## Endpoints

### Auth

#### `POST /auth/register`

Create a new user account.

**Request**

```json
{
  "email": "alice@example.com",
  "password": "S3cur3P@ss!",
  "full_name": "Alice Smith"
}
```

**Response** `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "alice@example.com",
  "full_name": "Alice Smith",
  "is_active": true,
  "created_at": "2026-04-25T10:00:00Z"
}
```

**Errors**

| Status | Detail |
| --- | --- |
| 400 | `"Email already registered"` |
| 422 | Validation error (password too short, invalid email) |

---

#### `POST /auth/login`

Obtain a JWT access token.

**Request**

```json
{
  "email": "alice@example.com",
  "password": "S3cur3P@ss!"
}
```

**Response** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Errors**

| Status | Detail |
| --- | --- |
| 401 | `"Invalid credentials"` |
| 403 | `"Inactive user"` |

---

#### `GET /auth/me`

Get the currently authenticated user.

**Headers**: `Authorization: Bearer <token>` (required)

**Response** `200 OK`

```json
{
  "id": "a1b2c3d4-...",
  "email": "alice@example.com",
  "full_name": "Alice Smith",
  "is_active": true,
  "created_at": "2026-04-25T10:00:00Z"
}
```

---

### Analyses

#### `POST /analyses`

Analyze a resume against a job description. Runs synchronously (default) or asynchronously (`?async=true` — roadmap).

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | File (PDF) | ✅ | Resume file, `application/pdf`, ≤ 10 MB |
| `job_description` | string | ✅ | Job description text, 20–20 000 characters |

**Headers**: `Authorization: Bearer <token>` (optional — guest submissions allowed)

**curl**

```bash
curl -X POST https://app.ai-resume-analyser.example.com/api/v1/analyses \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@resume.pdf" \
  -F "job_description=Senior Python Engineer — 5+ years FastAPI, PostgreSQL, AWS EKS, Docker, Terraform..."
```

**Response** `201 Created`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "completed",
  "resume_filename": "resume.pdf",

  "overall_score": 81.4,
  "semantic_score": 84.2,
  "skill_score": 76.7,
  "experience_score": 82.0,

  "matched_skills": [
    "Python", "FastAPI", "PostgreSQL", "Docker", "AWS",
    "SQLAlchemy", "Pydantic", "REST APIs", "Git"
  ],
  "missing_skills": [
    "Kubernetes", "Terraform", "Redis", "Helm", "EKS"
  ],

  "section_breakdown": {
    "experience": { "score": 82.0, "evidence": ["5 years backend development", "led team of 3"] },
    "skills": { "score": 76.7, "evidence": ["Python, FastAPI, PostgreSQL listed"] },
    "education": { "score": 90.0, "evidence": ["BSc Computer Science"] }
  },

  "llm_feedback": {
    "summary": "Strong Python backend profile with proven FastAPI and AWS experience. Key gap is container orchestration — Kubernetes and Terraform are high-frequency JD requirements not evidenced in the resume.",
    "strengths": [
      "Deep FastAPI and async Python expertise demonstrated through production projects",
      "AWS deployment experience (EC2, S3, RDS) aligns well with the role",
      "Strong testing culture — pytest + coverage visible in GitHub projects"
    ],
    "gaps": [
      "No Kubernetes / Helm experience mentioned — core JD requirement",
      "Terraform / IaC entirely absent",
      "Redis caching experience not evidenced despite JD emphasis"
    ],
    "ats_warnings": [
      "'container orchestration' absent — high-frequency JD term (appears 4×)",
      "'infrastructure as code' not mentioned — appears 3× in JD"
    ],
    "seniority_fit": "Strong match for Senior level; gaps in infra/devops may position as mid-Senior",
    "recommended_keywords": ["Kubernetes", "Helm", "Terraform", "EKS", "IaC", "Redis", "Celery"]
  },

  "suggested_bullets": [
    "Containerised FastAPI microservices with Docker multi-stage builds (Dockerfile), reducing image size by 60% and startup time to < 3s",
    "Automated AWS infrastructure provisioning with Terraform managing VPC, RDS, S3, and IAM across dev/prod environments"
  ],

  "llm_provider": "openai",
  "llm_model": "gpt-4o-mini",
  "duration_ms": 3241,
  "error": null,
  "created_at": "2026-04-25T10:30:00Z"
}
```

**Errors**

| Status | Detail |
| --- | --- |
| 400 | `"File appears empty"` |
| 401 | `"Not authenticated"` (if endpoint requires auth) |
| 413 | `"File exceeds 10 MB"` |
| 415 | `"Unsupported file type: application/msword"` |
| 422 | Validation error (`job_description` too short) |
| 429 | Rate limit exceeded |
| 500 | `"Analysis failed"` (LLM or parsing error) |

---

#### `GET /analyses/{analysis_id}`

Retrieve a specific analysis by UUID.

**Path params**: `analysis_id` — UUID of the analysis

**Authorization**: Guest analyses require no auth. User-owned analyses require the owning user's token.

**curl**

```bash
curl https://app.ai-resume-analyser.example.com/api/v1/analyses/3fa85f64-5717-4562-b3fc-2c963f66afa6 \
  -H "Authorization: Bearer $TOKEN"
```

**Response** `200 OK` — same schema as `POST /analyses` response

**Errors**

| Status | Detail |
| --- | --- |
| 403 | `"Forbidden"` — user does not own this analysis |
| 404 | `"Analysis not found"` |

---

#### `GET /analyses`

List the authenticated user's analyses (newest first).

**Headers**: `Authorization: Bearer <token>` (required)

**Query params**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | int | 20 | Max results (capped at 100) |
| `offset` | int | 0 | Pagination offset |

**Response** `200 OK`

```json
[
  {
    "id": "3fa85f64-...",
    "resume_filename": "resume.pdf",
    "overall_score": 81.4,
    "status": "completed",
    "created_at": "2026-04-25T10:30:00Z"
  },
  {
    "id": "2bc3d4e5-...",
    "resume_filename": "resume_v2.pdf",
    "overall_score": 87.1,
    "status": "completed",
    "created_at": "2026-04-24T09:15:00Z"
  }
]
```

---

### Health

#### `GET /healthz`

Liveness probe. Returns 200 if the process is alive.

```json
{ "status": "ok", "version": "1.0.0", "env": "prod" }
```

#### `GET /readyz`

Readiness probe. Checks database and Redis connectivity.

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

If a dependency is degraded:

```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "redis": "degraded: ConnectionRefusedError"
  }
}
```

---

### Metrics

#### `GET /metrics`

Prometheus exposition format. Used by Prometheus scraper.

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",endpoint="/api/v1/analyses",status_code="201"} 1247.0
http_requests_total{method="GET",endpoint="/api/v1/analyses/{id}",status_code="200"} 832.0

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",endpoint="/api/v1/analyses",le="1.0"} 891.0
http_request_duration_seconds_bucket{method="POST",endpoint="/api/v1/analyses",le="2.5"} 1198.0
http_request_duration_seconds_bucket{method="POST",endpoint="/api/v1/analyses",le="+Inf"} 1247.0

# HELP llm_tokens_total LLM tokens consumed
# TYPE llm_tokens_total counter
llm_tokens_total{provider="openai",model="gpt-4o-mini",kind="prompt"} 1843210.0
llm_tokens_total{provider="openai",model="gpt-4o-mini",kind="completion"} 412080.0
```

---

## Error Response Schema

All error responses follow this shape:

```json
{
  "detail": "Human-readable error message"
}
```

Validation errors (422) return:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "job_description"],
      "msg": "String should have at least 20 characters",
      "input": "Short JD",
      "ctx": { "min_length": 20 }
    }
  ]
}
```

---

## Python SDK Example

```python
import httpx

class ResumeAnalyserClient:
    def __init__(self, base_url: str, token: str | None = None):
        self.client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {token}"} if token else {},
            timeout=90,
        )

    def login(self, email: str, password: str) -> str:
        resp = self.client.post("/auth/login", json={"email": email, "password": password})
        resp.raise_for_status()
        token = resp.json()["access_token"]
        self.client.headers["Authorization"] = f"Bearer {token}"
        return token

    def analyze(self, pdf_path: str, job_description: str) -> dict:
        with open(pdf_path, "rb") as f:
            resp = self.client.post(
                "/analyses",
                files={"file": (pdf_path, f, "application/pdf")},
                data={"job_description": job_description},
            )
        resp.raise_for_status()
        return resp.json()

    def get_analysis(self, analysis_id: str) -> dict:
        resp = self.client.get(f"/analyses/{analysis_id}")
        resp.raise_for_status()
        return resp.json()


# Usage
client = ResumeAnalyserClient("https://app.ai-resume-analyser.example.com/api/v1")
client.login("alice@example.com", "S3cur3P@ss!")
result = client.analyze("alice_resume.pdf", "Senior Python Engineer with FastAPI...")
print(f"Score: {result['overall_score']:.1f} | Missing: {result['missing_skills']}")
```
