import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import type { AnalysisResponse, AnalysisSummary, AnalyzePayload } from '@/types'

// ─── API Functions ────────────────────────────────────────────────────────────

async function analyzeResume(payload: AnalyzePayload): Promise<AnalysisResponse> {
  const formData = new FormData()
  formData.append('file', payload.file)
  formData.append('job_description', payload.job_description)

  const { data } = await apiClient.post<AnalysisResponse>('/analyses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000, // 2 minutes for LLM processing
  })
  return data
}

async function getAnalysis(id: string): Promise<AnalysisResponse> {
  const { data } = await apiClient.get<AnalysisResponse>(`/analyses/${id}`)
  return data
}

async function listAnalyses(): Promise<AnalysisSummary[]> {
  const { data } = await apiClient.get<AnalysisSummary[]>('/analyses')
  return data
}

// ─── React Query Keys ─────────────────────────────────────────────────────────

export const analysisKeys = {
  all: () => ['analyses'] as const,
  lists: () => [...analysisKeys.all(), 'list'] as const,
  list: () => [...analysisKeys.lists()] as const,
  details: () => [...analysisKeys.all(), 'detail'] as const,
  detail: (id: string) => [...analysisKeys.details(), id] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAnalyzeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: analyzeResume,
    onSuccess: (data) => {
      // Prime the detail cache
      queryClient.setQueryData(analysisKeys.detail(data.id), data)
      // Invalidate list so it refetches
      void queryClient.invalidateQueries({ queryKey: analysisKeys.lists() })
    },
  })
}

export function useAnalysisQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: analysisKeys.detail(id),
    queryFn: () => getAnalysis(id),
    enabled: enabled && !!id,
    // Poll if status is pending/processing
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'pending' || status === 'processing') return 2000
      return false
    },
  })
}

export function useAnalysesListQuery(enabled = true) {
  return useQuery({
    queryKey: analysisKeys.list(),
    queryFn: listAnalyses,
    enabled,
  })
}
