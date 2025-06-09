import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/api/client';
import type { SecurityResponse, SecurityMetrics } from '@/api/endpoints';

export function useSecurity() {
  const queryClient = useQueryClient();

  // Query to get security data
  const securityQuery = useQuery<ApiResponse<SecurityResponse>, Error>({
    queryKey: ['security'],
    queryFn: async () => {
      const response = await apiClient.get<SecurityResponse>('/api/security');
      return response;
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });

  // Mutation to run a security scan
  const runScanMutation = useMutation<ApiResponse<{ id: string; status: string }>, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post<{ id: string; status: string }>('/api/security/scan');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security'] });
    },
  });

  // Mutation to update finding status
  const updateFindingMutation = useMutation<ApiResponse<{ id: string; status: string }>, Error, { id: string; status: string }>({
    mutationFn: async ({ id, status }) => {
      const response = await apiClient.put<{ id: string; status: string }>(`/api/security/findings/${id}`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security'] });
    },
  });

  const defaultMetrics: SecurityMetrics = {
    active_scans: 0,
    total_findings: 0,
    critical_findings: 0,
    security_score: 0,
    last_scan: null,
    scan_status: 'idle'
  };

  return {
    metrics: securityQuery.data?.data.metrics ?? defaultMetrics,
    recentScans: securityQuery.data?.data.recent_scans ?? [],
    activeScans: securityQuery.data?.data.active_scans ?? [],
    recentFindings: securityQuery.data?.data.recent_findings ?? [],
    isLoading: securityQuery.isLoading,
    isError: securityQuery.isError,
    error: securityQuery.error,
    refetch: securityQuery.refetch,
    runScan: runScanMutation.mutate,
    updateFinding: updateFindingMutation.mutate,
    isScanning: runScanMutation.isPending,
    isUpdating: updateFindingMutation.isPending,
  };
} 