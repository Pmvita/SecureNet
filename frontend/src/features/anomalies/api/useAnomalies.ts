import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse, ApiEndpoints } from '../../../api/endpoints';

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
      const response = await apiClient.get<ApiEndpoints['GET']['/api/anomalies/list']['response']>('/api/anomalies/list', {
        params: {
          ...filters,
          page,
          pageSize,
        },
      });
      return response;
    },
    refetchInterval: refreshInterval,
    staleTime: 30000,
  });

  const anomalies = (anomaliesData?.data && typeof anomaliesData.data === "object" && anomaliesData.data.data?.items) ?? [];
  const total = (anomaliesData?.data && typeof anomaliesData.data === "object" && anomaliesData.data.data?.total) ?? 0;

  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    isError: isMetricsError,
    error: metricsError,
  } = useQuery({
    queryKey: ['anomalies', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEndpoints['GET']['/api/anomalies/stats']['response']>('/api/anomalies/stats');
      return response;
    },
    refetchInterval: refreshInterval,
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