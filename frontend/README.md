# ResumeAI Frontend

Production-grade React + Vite + TypeScript + Tailwind frontend for the AI Resume Analyser.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI library |
| Vite | 5 | Build tool + dev server |
| TypeScript | 5 (strict) | Type safety |
| Tailwind CSS | 3 | Styling |
| React Router | 6 | Client-side routing |
| TanStack Query | 5 | Server state management |
| Axios | 1 | HTTP client |
| Zod | 3 | Schema validation |
| Recharts | 2 | Charts & data viz |
| Lucide React | — | Icons |
| CVA | 0.7 | Component variants |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Environment

Copy `.env.example` and configure:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). Hot module replacement enabled.

### Production Build

```bash
npm run build       # Type-check + bundle → dist/
npm run preview     # Preview production build locally
```

### Linting & Type Checking

```bash
npm run lint        # ESLint
npm run type-check  # TypeScript (no emit)
```

## Project Structure

```
src/
├── api/                  # React Query hooks wrapping API calls
│   ├── analyses.ts       # useAnalyzeMutation, useAnalysisQuery, useAnalysesListQuery
│   └── auth.ts           # useLoginMutation, useRegisterMutation, useMeQuery
├── components/
│   ├── charts/           # Recharts components
│   │   ├── CategoryBreakdownChart.tsx   # Radar chart (3 score dimensions)
│   │   ├── ScoreGauge.tsx               # Radial gauge (red→amber→green)
│   │   ├── SectionScoresBar.tsx         # Horizontal bar chart per section
│   │   └── SkillCoverageChart.tsx       # Donut chart (matched/missing)
│   ├── layout/
│   │   ├── AppShell.tsx  # Root layout + theme init
│   │   ├── Footer.tsx
│   │   └── Navbar.tsx    # Logo, nav links, auth, theme toggle, mobile menu
│   └── ui/               # shadcn-style primitives (no shadcn CLI)
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── separator.tsx
│       ├── skeleton.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
├── hooks/
│   └── useAuth.ts        # Unified auth hook (login, logout, register, user)
├── lib/
│   ├── api.ts            # Axios instance + JWT interceptor + 401 handling
│   └── utils.ts          # cn(), formatDate(), formatDuration(), getErrorMessage()
├── pages/
│   ├── HistoryPage.tsx   # Auth-gated table of past analyses
│   ├── HomePage.tsx      # Drag-drop PDF upload + JD textarea + analyze
│   ├── LoginPage.tsx     # Zod-validated login form
│   ├── RegisterPage.tsx  # Zod-validated register form + password strength
│   └── ResultsPage.tsx   # Full analysis dashboard (gauges, charts, feedback, bullets)
├── types/
│   └── index.ts          # AnalysisResponse, LLMFeedback, User, Token, etc.
├── App.tsx               # Router + lazy pages + error boundary
├── index.css             # Tailwind directives + CSS custom properties (dark/light)
└── main.tsx              # React root + QueryClient + BrowserRouter
```

## Features

### Homepage
- Drag-and-drop or click-to-browse PDF upload (validated, max 10 MB)
- Job description textarea with character counter
- Real-time Zod validation with per-field error messages
- Loading state with descriptive message during LLM processing

### Results Dashboard
- Overall score radial gauge (gradient: red → amber → green)
- Sub-score cards: Semantic Match, Skill Coverage, Experience Fit
- Matched skills (green badges) and missing skills (red badges) with expand/collapse
- Skill Coverage donut chart
- Category radar chart (semantic/skill/experience)
- Section-by-section horizontal bar chart heatmap
- AI Feedback tabs: Summary, Strengths, Gaps, ATS Warnings, Recommended Keywords
- Suggested bullet points in accordion
- Seniority fit badge
- Auto-polls backend every 2 seconds while `status === pending|processing`

### History Page
- Auth-gated (redirects to login if unauthenticated)
- Table of past analyses with score chip, status badge, timestamp
- Click any row to open full results
- Refresh button

### Auth
- JWT stored in `localStorage` with automatic Bearer header injection
- 401 responses clear token and redirect to login, saving the intended URL
- Post-login redirects to the originally requested page

## Docker

### Build & Run (production)

```bash
# Build the runtime image
docker build --target runtime -t resumeai-frontend .

# Run with backend URL
docker run -p 80:80 -e API_UPSTREAM=backend:8000 resumeai-frontend
```

The nginx reverse proxy routes `/api/*` to `http://${API_UPSTREAM}/api/` and falls back to `index.html` for all SPA routes.

### Development container

```bash
docker build --target dev -t resumeai-frontend-dev .
docker run -p 5173:5173 -v $(pwd)/src:/app/src resumeai-frontend-dev
```

### Build argument

Override the API base URL at build time:

```bash
docker build --target runtime \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t resumeai-frontend .
```

## Design System

- **Palette**: Slate + Indigo primary + Emerald/Amber/Red for scores
- **Dark mode**: Class-based (`<html class="dark">`), toggled via navbar, persisted to `localStorage`
- **Typography**: Inter (Google Fonts)
- **Animations**: CSS `fade-in`, `scale-in`, Tailwind `animate-pulse`, `animate-spin`
- **Tokens**: CSS custom properties (`--primary`, `--background`, etc.) in `src/index.css`
