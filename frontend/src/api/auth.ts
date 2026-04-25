import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient, { authStorage } from '@/lib/api'
import type { Token, User, LoginPayload, RegisterPayload } from '@/types'

// ─── API Functions ────────────────────────────────────────────────────────────

async function login(payload: LoginPayload): Promise<Token> {
  // OAuth2 expects form-encoded body
  const formData = new URLSearchParams()
  formData.append('username', payload.username)
  formData.append('password', payload.password)

  const { data } = await apiClient.post<Token>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/register', payload)
  return data
}

async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}

// ─── React Query Keys ─────────────────────────────────────────────────────────

export const authKeys = {
  me: () => ['auth', 'me'] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: (token) => {
      authStorage.setToken(token.access_token)
      // Invalidate "me" query so it refetches with new token
      void queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: register,
  })
}

export function useMeQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getMe,
    enabled: authStorage.isAuthenticated(),
    retry: false,
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      authStorage.clearToken()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
