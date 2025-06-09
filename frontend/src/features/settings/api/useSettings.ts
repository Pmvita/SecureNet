import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse, ApiEndpoints } from '../../../api/endpoints';

export interface Settings {
  api_key: string;
  network_monitoring: {
    enabled: boolean;
    interval: number;
    devices: string[];
  };
  security_scanning: {
    enabled: boolean;
    interval: number;
    types: string[];
  };
  notifications: {
    enabled: boolean;
    email: string;
    slack_webhook: string;
  };
  logging: {
    level: string;
    retention_days: number;
  };
}

export function useSettings() {
  const queryClient = useQueryClient();

  const {
    data: settingsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEndpoints['GET']['/api/settings']['response']>('/api/settings');
      return response;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      const response = await apiClient.put<ApiResponse<Settings>>('/api/settings', newSettings);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const settings = settingsData?.data?.data ?? {
    api_key: '',
    network_monitoring: {
      enabled: false,
      interval: 300,
      devices: [],
    },
    security_scanning: {
      enabled: false,
      interval: 3600,
      types: [],
    },
    notifications: {
      enabled: false,
      email: '',
      slack_webhook: '',
    },
    logging: {
      level: 'info',
      retention_days: 30,
    },
  };

  return {
    settings,
    isLoading,
    isError,
    error,
    updateSettings: updateSettings.mutateAsync,
    isUpdating: updateSettings.isPending,
  };
} 