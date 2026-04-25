import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60_000, // 60 second timeout for large PDF uploads / LLM processing
})

// ─── Request interceptor: attach JWT ─────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ─── Response interceptor: handle 401 ────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stale token and redirect to login
      localStorage.removeItem('access_token')
      // Only redirect if not already on an auth page
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        // Store intended destination for post-login redirect
        localStorage.setItem('redirect_after_login', window.location.pathname)
        window.location.href = '/login'
      }
    }

    // Normalize error message from backend detail field
    const axiosError = error as AxiosError<{ detail?: string | { msg: string }[] }>
    const detail = axiosError.response?.data?.detail
    let message: string

    if (typeof detail === 'string') {
      message = detail
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail.map((d) => d.msg).join(', ')
    } else {
      message = error.message || 'Request failed'
    }

    const normalizedError = new Error(message) as Error & { status: number }
    normalizedError.status = error.response?.status ?? 0
    return Promise.reject(normalizedError)
  },
)

// ─── Auth token helpers ───────────────────────────────────────────────────────

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem('access_token')
  },
  setToken(token: string): void {
    localStorage.setItem('access_token', token)
  },
  clearToken(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('redirect_after_login')
  },
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
  getRedirectAfterLogin(): string {
    return localStorage.getItem('redirect_after_login') ?? '/'
  },
}

export default apiClient
