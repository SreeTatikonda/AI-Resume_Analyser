import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Lightbulb,
  ListChecks,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Wand2,
  XCircle,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScoreGauge } from '@/components/charts/ScoreGauge'
import { SectionScoresBar } from '@/components/charts/SectionScoresBar'
import { SkillCoverageChart } from '@/components/charts/SkillCoverageChart'
import { CategoryBreakdownChart } from '@/components/charts/CategoryBreakdownChart'
import { useAnalysisQuery } from '@/api/analyses'
import type { AnalysisResponse } from '@/types'
import { scoreCategory, scoreColor } from '@/types'
import { cn, formatDateTime, formatDuration, getErrorMessage } from '@/lib/utils'

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCard({
  label,
  score,
  icon,
  description,
}: {
  label: string
  score: number | null
  icon: React.ReactNode
  description: string
}) {
  const cat = scoreCategory(score)
  const color = scoreColor(score)
  const bgMap = { low: 'bg-red-50 dark:bg-red-950/20', medium: 'bg-amber-50 dark:bg-amber-950/20', high: 'bg-green-50 dark:bg-green-950/20' }
  const borderMap = { low: 'border-red-200 dark:border-red-800', medium: 'border-amber-200 dark:border-amber-800', high: 'border-green-200 dark:border-green-800' }

  return (
    <Card className={cn('transition-all', borderMap[cat], bgMap[cat])}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="flex-shrink-0 rounded-xl p-2.5" style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color }}>
            {score !== null ? `${Math.round(score)}` : 'N/A'}
            <span className="text-sm font-medium text-muted-foreground">/100</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SeniorityBadge({ value }: { value: string }) {
  const colorMap: Record<string, 'indigo' | 'emerald' | 'amber' | 'violet' | 'sky' | 'slate'> = {
    junior: 'sky',
    mid: 'indigo',
    senior: 'emerald',
    lead: 'violet',
    director: 'amber',
    executive: 'amber',
  }
  const key = value.toLowerCase().split(/\s/)[0]
  const variant = colorMap[key] ?? 'slate'
  return (
    <Badge variant={variant} className="capitalize font-semibold text-sm px-3 py-1">
      <Award className="h-3.5 w-3.5 mr-1" />
      {value}
    </Badge>
  )
}

function SkillBadgeList({
  skills,
  variant,
  icon,
  emptyText,
}: {
  skills: string[]
  variant: 'success' | 'destructive'
  icon: React.ReactNode
  emptyText: string
}) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 12
  const shown = expanded ? skills : skills.slice(0, LIMIT)
  const hasMore = skills.length > LIMIT

  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground italic">{emptyText}</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {shown.map((skill, i) => (
          <Badge key={i} variant={variant} className="gap-1">
            {icon}
            {skill}
          </Badge>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> Show less</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> Show {skills.length - LIMIT} more</>
          )}
        </button>
      )}
    </div>
  )
}

function BulletAccordion({ bullets }: { bullets: string[] }) {
  const [open, setOpen] = useState(false)

  if (bullets.length === 0) return null

  return (
    <Card>
      <button
        className="flex w-full items-center justify-between p-5 text-left group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">
            Suggested Bullet Points ({bullets.length})
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <CardContent className="pt-0 pb-5 animate-in">
          <Separator className="mb-4" />
          <ul className="space-y-2.5">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/90">
                <span className="flex-shrink-0 text-primary font-bold mt-0.5">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div>
          <Skeleton className="h-7 w-56 mb-1.5" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-48" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function AnalysisResults({ analysis }: { analysis: AnalysisResponse }) {
  const overallCat = scoreCategory(analysis.overall_score)
  const catLabel = { low: 'Needs Improvement', medium: 'Good Match', high: 'Strong Match' }[overallCat]

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{analysis.resume_filename}</h1>
            <Badge
              variant={overallCat === 'high' ? 'success' : overallCat === 'medium' ? 'warning' : 'destructive'}
              className="text-xs"
            >
              {catLabel}
            </Badge>
            {analysis.status === 'failed' && (
              <Badge variant="destructive">Failed</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(analysis.created_at)}
            </span>
            {analysis.duration_ms && (
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Analysed in {formatDuration(analysis.duration_ms)}
              </span>
            )}
            {analysis.llm_model && (
              <span className="flex items-center gap-1">
                <Brain className="h-3.5 w-3.5" />
                {analysis.llm_provider} / {analysis.llm_model}
              </span>
            )}
          </p>
        </div>

        {analysis.llm_feedback?.seniority_fit && (
          <SeniorityBadge value={analysis.llm_feedback.seniority_fit} />
        )}
      </div>

      {/* Error state */}
      {analysis.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{analysis.error}</AlertDescription>
        </Alert>
      )}

      {/* Score overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="sm:col-span-2 lg:col-span-1 flex items-center justify-center py-6">
          <ScoreGauge score={analysis.overall_score} label="Overall Score" size="md" />
        </Card>
        <ScoreCard
          label="Semantic Match"
          score={analysis.semantic_score}
          icon={<Brain className="h-5 w-5" />}
          description="How well your experience aligns"
        />
        <ScoreCard
          label="Skill Coverage"
          score={analysis.skill_score}
          icon={<Target className="h-5 w-5" />}
          description="Required skills you possess"
        />
        <ScoreCard
          label="Experience Fit"
          score={analysis.experience_score}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Years & seniority alignment"
        />
      </div>

      {/* Tabs: Skills | Charts | Feedback | Bullets */}
      <Tabs defaultValue="skills">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
          {analysis.suggested_bullets.length > 0 && (
            <TabsTrigger value="bullets">Bullets</TabsTrigger>
          )}
        </TabsList>

        {/* ── Skills tab ── */}
        <TabsContent value="skills">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Matched Skills
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {analysis.matched_skills.length}
                  </span>
                </CardTitle>
                <CardDescription>Skills from the JD found on your resume</CardDescription>
              </CardHeader>
              <CardContent>
                <SkillBadgeList
                  skills={analysis.matched_skills}
                  variant="success"
                  icon={<CheckCircle2 className="h-3 w-3" />}
                  emptyText="No matched skills detected"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Missing Skills
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {analysis.missing_skills.length}
                  </span>
                </CardTitle>
                <CardDescription>Required skills absent from your resume</CardDescription>
              </CardHeader>
              <CardContent>
                <SkillBadgeList
                  skills={analysis.missing_skills}
                  variant="destructive"
                  icon={<XCircle className="h-3 w-3" />}
                  emptyText="No missing skills — great job!"
                />
              </CardContent>
            </Card>
          </div>

          {/* Skill coverage donut */}
          {(analysis.matched_skills.length > 0 || analysis.missing_skills.length > 0) && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Skill Coverage Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillCoverageChart
                  matched={analysis.matched_skills.length}
                  missing={analysis.missing_skills.length}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Charts tab ── */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category radar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Score Breakdown
                </CardTitle>
                <CardDescription>Semantic, skill, and experience scores</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryBreakdownChart
                  semantic={analysis.semantic_score}
                  skill={analysis.skill_score}
                  experience={analysis.experience_score}
                />
              </CardContent>
            </Card>

            {/* Section heatmap */}
            {Object.keys(analysis.section_breakdown).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Resume Sections
                  </CardTitle>
                  <CardDescription>Score per resume section</CardDescription>
                </CardHeader>
                <CardContent>
                  <SectionScoresBar data={analysis.section_breakdown} orientation="horizontal" />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── AI Feedback tab ── */}
        <TabsContent value="feedback">
          {analysis.llm_feedback ? (
            <div className="space-y-4">
              {/* Summary */}
              {analysis.llm_feedback.summary && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {analysis.llm_feedback.summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                {analysis.llm_feedback.strengths.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.llm_feedback.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                            <span className="text-foreground/90">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Gaps */}
                {analysis.llm_feedback.gaps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <XCircle className="h-4 w-4" />
                        Gaps to Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.llm_feedback.gaps.map((g, i) => (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span className="text-foreground/90">{g}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ATS warnings */}
              {analysis.llm_feedback.ats_warnings.length > 0 && (
                <Card className="border-warning/30 bg-warning/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-warning">
                      <TriangleAlert className="h-4 w-4" />
                      ATS Warnings
                    </CardTitle>
                    <CardDescription>
                      These issues may cause your resume to be filtered by Applicant Tracking Systems
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.llm_feedback.ats_warnings.map((w, i) => (
                        <li key={i} className="flex gap-2.5 text-sm">
                          <TriangleAlert className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                          <span className="text-foreground/90">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommended keywords */}
              {analysis.llm_feedback.recommended_keywords.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Recommended Keywords
                    </CardTitle>
                    <CardDescription>
                      Add these to strengthen your resume for this role
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.llm_feedback.recommended_keywords.map((kw, i) => (
                        <Badge key={i} variant="indigo" className="font-mono text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">AI feedback not available for this analysis</p>
            </div>
          )}
        </TabsContent>

        {/* ── Bullets tab ── */}
        {analysis.suggested_bullets.length > 0 && (
          <TabsContent value="bullets">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4 text-primary" />
                  AI-Generated Bullet Points
                </CardTitle>
                <CardDescription>
                  Tailored achievement-focused bullets based on the job description — edit and adapt for your resume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.suggested_bullets.map((bullet, i) => (
                    <li key={i} className="flex gap-3">
                      <ListChecks className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground/90 leading-relaxed">{bullet}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* CTA: analyse another */}
      <div className="flex justify-center gap-4 pt-4">
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Analyse Another Resume
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ─── Processing state ─────────────────────────────────────────────────────────

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in">
      <div className="relative">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Analysing Your Resume</h2>
        <p className="text-muted-foreground mt-1 max-w-xs">
          Our AI is carefully reviewing your resume against the job description. This usually takes 10–30 seconds.
        </p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: analysis, isLoading, isError, error } = useAnalysisQuery(id ?? '', !!id)

  if (!id) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        New Analysis
      </Link>

      {/* States */}
      {isLoading && <ResultsSkeleton />}

      {isError && (
        <Alert variant="destructive" className="animate-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load analysis</AlertTitle>
          <AlertDescription>
            {getErrorMessage(error)}{' '}
            <Link to="/" className="underline font-medium">
              Try again
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {analysis && (analysis.status === 'pending' || analysis.status === 'processing') && (
        <ProcessingState />
      )}

      {analysis && analysis.status === 'completed' && <AnalysisResults analysis={analysis} />}

      {analysis && analysis.status === 'failed' && (
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Failed</AlertTitle>
            <AlertDescription>
              {analysis.error ?? 'An unexpected error occurred during analysis.'}
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Try Again
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
