// ─── Auth Types ──────────────────────────────────────────────────────────────

export interface Token {
  access_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

export interface RegisterPayload {
  email: string
  password: string
  full_name?: string
}

export interface LoginPayload {
  username: string // OAuth2 form field
  password: string
}

// ─── Analysis Types ───────────────────────────────────────────────────────────

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface LLMFeedback {
  summary: string
  strengths: string[]
  gaps: string[]
  ats_warnings: string[]
  seniority_fit: string
  recommended_keywords: string[]
}

export interface SectionBreakdown {
  [section: string]: number
}

export interface AnalysisResponse {
  id: string
  status: AnalysisStatus
  resume_filename: string
  overall_score: number | null
  semantic_score: number | null
  skill_score: number | null
  experience_score: number | null
  matched_skills: string[]
  missing_skills: string[]
  section_breakdown: SectionBreakdown
  llm_feedback: LLMFeedback | null
  suggested_bullets: string[]
  llm_provider: string | null
  llm_model: string | null
  duration_ms: number | null
  error: string | null
  created_at: string
}

export interface AnalysisSummary {
  id: string
  status: AnalysisStatus
  resume_filename: string
  overall_score: number | null
  created_at: string
}

// ─── API Payload Types ────────────────────────────────────────────────────────

export interface AnalyzePayload {
  file: File
  job_description: string
}

// ─── Score Helpers ────────────────────────────────────────────────────────────

export type ScoreCategory = 'low' | 'medium' | 'high'

export function scoreCategory(score: number | null): ScoreCategory {
  if (score === null) return 'low'
  if (score >= 70) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

export function scoreColor(score: number | null): string {
  const cat = scoreCategory(score)
  if (cat === 'high') return '#16a34a'
  if (cat === 'medium') return '#f59e0b'
  return '#ef4444'
}

export function scoreLabel(score: number | null): string {
  if (score === null) return 'N/A'
  return `${Math.round(score)}%`
}
