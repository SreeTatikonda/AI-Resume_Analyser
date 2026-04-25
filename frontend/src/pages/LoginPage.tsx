import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginErrors = Partial<z.infer<typeof loginSchema>> & { form?: string }

export default function LoginPage() {
  const { login, loginMutation } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<LoginErrors>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const fieldErrors: LoginErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof fieldErrors
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    try {
      await login({ username: parsed.data.email, password: parsed.data.password })
    } catch (err) {
      setErrors({ form: getErrorMessage(err) })
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            className="h-10 w-10 mx-auto mb-3"
            aria-label="ResumeAI"
          >
            <rect width="40" height="40" rx="10" className="fill-primary" />
            <path d="M11 11h18M11 17h13M11 23h9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="28" r="6" className="fill-primary-foreground/25" />
            <path d="M28 25v3l2 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your ResumeAI account</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Form-level error */}
              {errors.form && (
                <Alert variant="destructive" className="animate-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.form}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrors((er) => ({ ...er, email: undefined }))
                  }}
                  error={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors((er) => ({ ...er, password: undefined }))
                    }}
                    error={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                loading={loginMutation.isPending}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one free
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Or{' '}
          <Link to="/" className="hover:underline">
            analyse a resume without signing in
          </Link>
        </p>
      </div>
    </div>
  )
}
