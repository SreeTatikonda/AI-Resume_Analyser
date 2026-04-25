import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FileText, History, LogIn, LogOut, Menu, Moon, Sun, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

// Inline SVG logo
function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-8 w-8 flex-shrink-0"
        aria-label="ResumeAI logo"
      >
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path d="M9 8h14M9 13h10M9 18h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="22" r="5" className="fill-primary-foreground/20" />
        <path
          d="M22 19.5v2.5l1.5 1.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-bold text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">
        Resume<span className="text-primary">AI</span>
      </span>
    </Link>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-md',
    isActive
      ? 'text-primary bg-primary/10'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
  )

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    setMobileOpen(false)
    await logout()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <nav className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Logo />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <FileText className="h-4 w-4" />
            Analyse
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/history" className={navLinkClass}>
              <History className="h-4 w-4" />
              History
            </NavLink>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {user?.email ?? 'Account'}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background animate-in">
          <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            <NavLink
              to="/"
              end
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <FileText className="h-4 w-4" />
              Analyse Resume
            </NavLink>
            {isAuthenticated && (
              <NavLink
                to="/history"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <History className="h-4 w-4" />
                History
              </NavLink>
            )}
            <div className="h-px bg-border my-1" />
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" className="justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setMobileOpen(false); navigate('/login') }}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setMobileOpen(false); navigate('/register') }}
                >
                  Get Started Free
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
