import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-background/80 mt-auto">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <rect width="24" height="24" rx="6" className="fill-primary" />
              <path d="M7 6h10M7 10h7M7 14h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium text-foreground">
              Resume<span className="text-primary">AI</span>
            </span>
          </div>

          <nav aria-label="Footer navigation" className="flex items-center gap-4">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Analyse
            </Link>
            <Link
              to="/history"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </Link>
            <Link
              to="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">
            &copy; {year} ResumeAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
