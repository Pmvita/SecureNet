import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse, SecurityResponse, SecurityMetrics } from '../../../api/endpoints';

export function useSecurity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['security'],
    queryFn: async () => {
      const response = await apiClient.get<SecurityResponse>('/api/security');
      return response;
    },
    refetchInterval: 60000, // Changed from 30000 to 60000 (1 minute)
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const resolveThreatMutation = useMutation({
    mutationFn: async (threatId: string) => {
      const response = await apiClient.post<{ id: string; status: string }>(`/api/security/threats/${threatId}/resolve`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security'] });
    },
  });

  const runScanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ id: string; status: string }>('/api/security/scan');
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
    metrics: query.data?.data.metrics ?? defaultMetrics,
    recentScans: query.data?.data.recent_scans ?? [],
    activeScans: query.data?.data.active_scans ?? [],
    recentFindings: query.data?.data.recent_findings ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    resolveThreat: resolveThreatMutation.mutate,
    runScan: runScanMutation.mutate,
    isResolving: resolveThreatMutation.isPending,
    isScanning: runScanMutation.isPending,
  };
} 