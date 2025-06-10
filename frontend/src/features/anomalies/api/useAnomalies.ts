import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse, ApiEndpoints } from '../../../api/endpoints';

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

export interface Anomaly {
  id: string;
  type: 'security' | 'network' | 'system' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  description: string;
  source: string;
  timestamp: string;
  metrics?: Record<string, unknown>;
}

export interface AnomalyMetrics {
  total: number;
  open: number;
  critical: number;
  resolved: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface UseAnomaliesOptions {
  filters?: {
    status?: string;
    severity?: string;
    type?: string;
  };
  page?: number;
  pageSize?: number;
  refreshInterval?: number;
}

export const useAnomalies = (options: UseAnomaliesOptions = {}) => {
  const queryClient = useQueryClient();
  const {
    filters = {},
    page = 1,
    pageSize = 20,
    refreshInterval = 60000,
  } = options;

  const {
    data: anomaliesData,
    isLoading: isLoadingAnomalies,
    isError: isAnomaliesError,
    error: anomaliesError,
  } = useQuery({
    queryKey: ['anomalies', 'list', filters, page, pageSize],
    queryFn: async () => {
      // In development mode, return mock data
      if (DEV_MODE) {
        return {
          data: {
            items: [
              {
                id: '1',
                type: 'security',
                severity: 'high',
                status: 'active',
                description: 'Unusual login pattern detected',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                source: 'Authentication System',
                metrics: { attempts: 5, success_rate: 0.2 }
              },
              {
                id: '2',
                type: 'network',
                severity: 'medium',
                status: 'investigating',
                description: 'Bandwidth spike detected',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                source: 'Network Monitor',
                metrics: { bandwidth: '150%', duration: '15min' }
              }
            ],
            total: 2,
            page: page,
            page_size: pageSize,
            total_pages: 1
          }
        };
      }

      const response = await apiClient.get<ApiEndpoints['GET']['/api/anomalies/list']['response']>('/api/anomalies/list', {
        params: {
          ...filters,
          page,
          pageSize,
        },
      });
      return response;
    },
    refetchInterval: DEV_MODE ? false : refreshInterval,
    staleTime: 30000,
  });

  const anomalies = anomaliesData?.data?.items ?? [];
  const total = anomaliesData?.data?.total ?? 0;

  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    isError: isMetricsError,
    error: metricsError,
  } = useQuery({
    queryKey: ['anomalies', 'stats'],
    queryFn: async () => {
      // In development mode, return mock data
      if (DEV_MODE) {
        return {
          data: {
            total: 2,
            open: 1,
            critical: 0,
            resolved: 1,
            by_type: { security: 1, network: 1, system: 0, application: 0 },
            by_severity: { low: 0, medium: 1, high: 1, critical: 0 }
          }
        };
      }

      const response = await apiClient.get<ApiEndpoints['GET']['/api/anomalies/stats']['response']>('/api/anomalies/stats');
      return response;
    },
    refetchInterval: DEV_MODE ? false : refreshInterval,
    staleTime: 30000,
  });

  const metrics = metricsData?.data ?? {
    total: 0,
    open: 0,
    critical: 0,
    resolved: 0,
    by_type: {},
    by_severity: {}
  };

  const resolveAnomaly = useMutation({
    mutationFn: async (anomalyId: string) => {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>(`/api/anomalies/${anomalyId}/resolve`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });

  const markAsFalsePositive = useMutation({
    mutationFn: async (anomalyId: string) => {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>(`/api/anomalies/${anomalyId}/false-positive`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });

  const runAnalysis = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>('/api/anomalies/analyze');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });

  return {
    anomalies,
    total,
    metrics,
    pageSize,
    isLoading: isLoadingAnomalies || isLoadingMetrics,
    isError: isAnomaliesError || isMetricsError,
    error: anomaliesError || metricsError,
    resolveAnomaly: resolveAnomaly.mutateAsync,
    markAsFalsePositive: markAsFalsePositive.mutateAsync,
    runAnalysis: runAnalysis.mutateAsync,
    isResolving: resolveAnomaly.isPending,
    isMarkingFalsePositive: markAsFalsePositive.isPending,
    isAnalyzing: runAnalysis.isPending,
  };
}; 