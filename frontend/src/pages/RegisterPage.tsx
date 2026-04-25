import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/utils'

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Please enter your full name').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type RegisterErrors = Partial<Record<keyof z.infer<typeof registerSchema>, string>> & {
  form?: string
}

export default function RegisterPage() {
  const { register, registerMutation } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<RegisterErrors>({})

  const clearError = (field: keyof RegisterErrors) =>
    setErrors((er) => ({ ...er, [field]: undefined }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsed = registerSchema.safeParse({ full_name: fullName, email, password, confirmPassword })
    if (!parsed.success) {
      const fieldErrors: RegisterErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RegisterErrors
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    try {
      await register({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        password: parsed.data.password,
      })
    } catch (err) {
      setErrors({ form: getErrorMessage(err) })
    }
  }

  const passwordStrength = (() => {
    if (!password) return null
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    if (score <= 2) return { label: 'Weak', color: 'bg-destructive', width: '33%' }
    if (score <= 3) return { label: 'Fair', color: 'bg-warning', width: '66%' }
    return { label: 'Strong', color: 'bg-success', width: '100%' }
  })()

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
          <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save analyses and track your progress
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Get Started Free</CardTitle>
            <CardDescription>No credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {errors.form && (
                <Alert variant="destructive" className="animate-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.form}</AlertDescription>
                </Alert>
              )}

              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); clearError('full_name') }}
                  error={!!errors.full_name}
                  aria-describedby={errors.full_name ? 'name-error' : undefined}
                />
                {errors.full_name && (
                  <p id="name-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email') }}
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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                    error={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : 'password-strength'}
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
                {/* Strength meter */}
                {passwordStrength && (
                  <div id="password-strength" className="space-y-1" aria-live="polite">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword') }}
                  error={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirm-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2 mt-2"
                size="lg"
                loading={registerMutation.isPending}
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
