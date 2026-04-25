import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeQuery, useLogoutMutation, useLoginMutation, useRegisterMutation } from '@/api/auth'
import { authStorage } from '@/lib/api'
import type { LoginPayload, RegisterPayload } from '@/types'

/**
 * Central auth hook — provides current user, auth status, login, logout, register.
 * Wraps react-query hooks and localStorage token management.
 */
export function useAuth() {
  const navigate = useNavigate()
  const { data: user, isLoading: isLoadingUser, error: meError } = useMeQuery()
  const loginMutation = useLoginMutation()
  const registerMutation = useRegisterMutation()
  const logoutMutation = useLogoutMutation()

  const isAuthenticated = authStorage.isAuthenticated() && !meError

  const login = useCallback(
    async (payload: LoginPayload) => {
      await loginMutation.mutateAsync(payload)
      const redirect = authStorage.getRedirectAfterLogin()
      navigate(redirect === '/login' || redirect === '/register' ? '/' : redirect, { replace: true })
    },
    [loginMutation, navigate],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await registerMutation.mutateAsync(payload)
      // After register, navigate to login
      navigate('/login', { replace: true })
    },
    [registerMutation, navigate],
  )

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync()
    navigate('/login', { replace: true })
  }, [logoutMutation, navigate])

  return {
    user: user ?? null,
    isAuthenticated,
    isLoadingUser,
    login,
    register,
    logout,
    loginMutation,
    registerMutation,
    logoutMutation,
  }
}
