import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse, SecurityResponse, SecurityMetrics } from '../../../api/endpoints';

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

export function useSecurity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['security'],
    queryFn: async () => {
      // In development mode, return mock data
      if (DEV_MODE) {
        return {
          data: {
            metrics: {
              active_scans: 2,
              total_findings: 15,
              critical_findings: 3,
              security_score: 85,
              last_scan: new Date(Date.now() - 3600000).toISOString(),
              scan_status: 'idle' as const
            },
            recent_scans: [
              {
                id: '1',
                type: 'vulnerability',
                status: 'completed',
                findings_count: 5,
                start_time: new Date(Date.now() - 7200000).toISOString(),
                end_time: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            active_scans: [],
            recent_findings: [
              {
                id: '1',
                severity: 'high',
                type: 'vulnerability',
                description: 'Outdated SSL certificate detected',
                timestamp: new Date(Date.now() - 1800000).toISOString()
              }
            ]
          }
        };
      }

      try {
        const response = await apiClient.get<SecurityResponse>('/api/security');
        console.log('Security API response:', response);
        if (!response || !response.data) {
          throw new Error('Invalid response from security API');
        }
        return response;
      } catch (error) {
        console.error('Security API error:', error);
        throw error;
      }
    },
    refetchInterval: DEV_MODE ? false : 60000, // Changed from 30000 to 60000 (1 minute)
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