import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, FileText, Sparkles, Upload, X, Zap } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAnalyzeMutation } from '@/api/analyses'
import { cn, getErrorMessage } from '@/lib/utils'

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const formSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_FILE_BYTES, `PDF must be ≤ ${MAX_FILE_SIZE_MB}MB`)
    .refine(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'),
      'Only PDF files are accepted',
    ),
  job_description: z
    .string()
    .min(50, 'Please provide at least 50 characters of job description')
    .max(10_000, 'Job description too long (max 10,000 characters)'),
})

type FormErrors = Partial<Record<keyof z.infer<typeof formSchema>, string>>

const FEATURES = [
  { icon: <Zap className="h-4 w-4" />, label: 'AI-powered analysis in seconds' },
  { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Skill gap & ATS report' },
  { icon: <Sparkles className="h-4 w-4" />, label: 'LLM feedback & bullet suggestions' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const mutation = useAnalyzeMutation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // ─── File helpers ─────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((selected: File | null) => {
    if (!selected) return
    const result = formSchema.shape.file.safeParse(selected)
    if (!result.success) {
      setErrors((e) => ({ ...e, file: result.error.errors[0].message }))
      return
    }
    setErrors((e) => ({ ...e, file: undefined }))
    setFile(selected)
  }, [])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] ?? null)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files[0] ?? null)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const parsed = formSchema.safeParse({ file, job_description: jobDescription })
    if (!parsed.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormErrors
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})

    try {
      const result = await mutation.mutateAsync({
        file: parsed.data.file,
        job_description: parsed.data.job_description,
      })
      navigate(`/analyses/${result.id}`)
    } catch (_err) {
      // Error is handled by mutation.error
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-background via-accent/20 to-background">
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-12 space-y-4 animate-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            AI Resume Analyser
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Get your resume{' '}
            <span className="text-gradient">job-ready</span> in seconds
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your resume and paste the job description. Our AI will give you an instant
            match score, skills gap analysis, ATS warnings, and tailored bullet suggestions.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {FEATURES.map((f, i) => (
              <Badge key={i} variant="secondary" className="gap-1.5 py-1 px-3">
                <span className="text-primary">{f.icon}</span>
                {f.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-xl border-border/50 animate-in">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* PDF Upload zone */}
              <div className="space-y-2">
                <Label htmlFor="resume-input" className="text-base font-semibold">
                  Resume (PDF)
                </Label>
                <div
                  className={cn(
                    'drop-zone cursor-pointer p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[180px]',
                    isDragging && 'active',
                    errors.file && 'border-destructive bg-destructive/5',
                    file && !errors.file && 'border-success/50 bg-success/5',
                  )}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload PDF resume"
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    id="resume-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={onInputChange}
                    className="sr-only"
                    aria-describedby={errors.file ? 'file-error' : undefined}
                  />

                  {file ? (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <FileText className="h-8 w-8" />
                        <div className="text-left">
                          <p className="font-semibold text-foreground text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile() }}
                          className="ml-4 rounded-full p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-success font-medium">Ready to analyse</p>
                    </>
                  ) : (
                    <>
                      <div className={cn(
                        'rounded-full p-4 transition-colors',
                        isDragging ? 'bg-primary/20' : 'bg-muted',
                      )}>
                        <Upload className={cn('h-8 w-8 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {isDragging ? 'Drop your PDF here' : 'Drag & drop your resume'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          or{' '}
                          <span className="text-primary font-medium underline underline-offset-2">
                            browse files
                          </span>
                          {' '}— PDF only, max {MAX_FILE_SIZE_MB}MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {errors.file && (
                  <p id="file-error" className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> {errors.file}
                  </p>
                )}
              </div>

              {/* Job description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jd-input" className="text-base font-semibold">
                    Job Description
                  </Label>
                  <span className={cn(
                    'text-xs tabular-nums transition-colors',
                    jobDescription.length > 9500 ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {jobDescription.length.toLocaleString()} / 10,000
                  </span>
                </div>
                <Textarea
                  id="jd-input"
                  placeholder="Paste the full job description here — include responsibilities, requirements, and preferred qualifications for the best analysis…"
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value)
                    if (errors.job_description) {
                      setErrors((er) => ({ ...er, job_description: undefined }))
                    }
                  }}
                  className="min-h-[200px] resize-y"
                  error={!!errors.job_description}
                  aria-describedby={errors.job_description ? 'jd-error' : undefined}
                  maxLength={10_000}
                />
                {errors.job_description && (
                  <p id="jd-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.job_description}
                  </p>
                )}
              </div>

              {/* Submit error */}
              {mutation.isError && (
                <Alert variant="destructive" className="animate-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Analysis failed</AlertTitle>
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                size="lg"
                className="w-full text-base h-12 font-semibold gap-2"
                loading={mutation.isPending}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  'Analysing your resume…'
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Analyse My Resume
                  </>
                )}
              </Button>

              {mutation.isPending && (
                <p className="text-center text-sm text-muted-foreground animate-pulse">
                  Our AI is reviewing your resume against the job description. This may take up to 30 seconds…
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-in">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> No signup required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> Files never stored permanently
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> ATS-optimised feedback
          </span>
        </div>
      </div>
    </div>
  )
}
