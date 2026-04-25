import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Clock, ExternalLink, FileText, History, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAnalysesListQuery } from '@/api/analyses'
import { useAuth } from '@/hooks/useAuth'
import type { AnalysisSummary } from '@/types'
import { scoreCategory, scoreColor } from '@/types'
import { cn, formatDateTime, getErrorMessage } from '@/lib/utils'

// ─── Score chip ───────────────────────────────────────────────────────────────

function ScoreChip({ score }: { score: number | null }) {
  const cat = scoreCategory(score)
  const color = scoreColor(score)
  const bg = { low: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800', medium: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800', high: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' }[cat]

  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums', bg)}
      style={{ color }}
      aria-label={`Score: ${score !== null ? Math.round(score) : 'N/A'}`}
    >
      {score !== null ? `${Math.round(score)}` : 'N/A'}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AnalysisSummary['status'] }) {
  const config = {
    completed: { variant: 'success' as const, label: 'Completed' },
    failed: { variant: 'destructive' as const, label: 'Failed' },
    processing: { variant: 'warning' as const, label: 'Processing' },
    pending: { variant: 'secondary' as const, label: 'Pending' },
  }[status]

  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
}

// ─── Row component ────────────────────────────────────────────────────────────

function AnalysisRow({ analysis }: { analysis: AnalysisSummary }) {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center gap-4 py-4 px-4 hover:bg-muted/40 transition-colors rounded-lg cursor-pointer group"
      onClick={() => navigate(`/analyses/${analysis.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/analyses/${analysis.id}`)}
      aria-label={`Open analysis for ${analysis.resume_filename}`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 rounded-lg bg-muted p-2.5">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
          {analysis.resume_filename}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="h-3 w-3" />
          {formatDateTime(analysis.created_at)}
        </p>
      </div>

      {/* Status */}
      <StatusBadge status={analysis.status} />

      {/* Score */}
      <ScoreChip score={analysis.overall_score} />

      {/* Link icon */}
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  )
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 px-4">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-1.5" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { isAuthenticated, isLoadingUser } = useAuth()
  const { data: analyses, isLoading, isError, error, refetch, isFetching } = useAnalysesListQuery(isAuthenticated)

  // Auth gate
  if (!isLoadingUser && !isAuthenticated) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-sm space-y-4">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in to view history</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Your past resume analyses are saved to your account. Sign in to access them.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link to="/login">
              <Button>Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Analysis History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {analyses ? `${analyses.length} past ${analyses.length === 1 ? 'analysis' : 'analyses'}` : 'Loading…'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load history</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span className="w-10" />
            <span>Resume</span>
            <span>Status</span>
            <span>Score</span>
            <span className="w-4" />
          </div>
          <Separator />
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <HistorySkeleton />}

          {!isLoading && analyses && analyses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-muted p-5">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No analyses yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Upload your first resume to get started. Results will appear here.
              </p>
              <Link to="/" className="mt-4">
                <Button className="gap-2">
                  <FileText className="h-4 w-4" />
                  Analyse a Resume
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && analyses && analyses.length > 0 && (
            <div>
              {analyses
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((analysis, idx) => (
                  <div key={analysis.id}>
                    <AnalysisRow analysis={analysis} />
                    {idx < analyses.length - 1 && <Separator className="mx-4" />}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-6 text-center">
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
