import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse, ApiEndpoints } from '../../../api/endpoints';

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

export interface Settings {
  system: {
    app_name: string;
    theme: string;
    auto_refresh: boolean;
    refresh_interval: number;
    timezone?: string;
    language?: string;
  };
  network_monitoring: {
    enabled: boolean;
    interval: number;
    timeout: number;
    interface: string;
    ip_ranges: string;
    discovery_method: string;
    max_devices: number;
    traffic_analysis: boolean;
    packet_capture: boolean;
    capture_filter: string;
    dns_monitoring: boolean;
    port_scan_detection: boolean;
    bandwidth_threshold: number;
  };
  security_scanning: {
    enabled: boolean;
    interval: number;
    severity_threshold: string;
  };
  notifications: {
    enabled: boolean;
    email: string;
    slack_webhook: string;
  };
  logging: {
    level: string;
    retention_days: number;
    audit_enabled: boolean;
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
      // In development mode, return mock data
      if (DEV_MODE) {
        return {
          data: {
            system: {
              app_name: 'SecureNet',
              theme: 'dark',
              auto_refresh: true,
              refresh_interval: 30,
              timezone: 'UTC',
              language: 'en'
            },
            network_monitoring: {
              enabled: true,
              interval: 300,
              timeout: 30,
              interface: 'auto',
              ip_ranges: '192.168.1.0/24,10.0.0.0/8',
              discovery_method: 'ping_arp',
              max_devices: 1000,
              traffic_analysis: false,
              packet_capture: false,
              capture_filter: 'tcp port 80 or tcp port 443',
              dns_monitoring: true,
              port_scan_detection: true,
              bandwidth_threshold: 100
            },
            security_scanning: {
              enabled: true,
              interval: 3600,
              severity_threshold: 'medium'
            },
            notifications: {
              enabled: false,
              email: '',
              slack_webhook: ''
            },
            logging: {
              level: 'info',
              retention_days: 30,
              audit_enabled: true
            }
          }
        };
      }

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

  const settings = settingsData?.data ?? {
    system: {
      app_name: 'SecureNet',
      theme: 'dark',
      auto_refresh: true,
      refresh_interval: 30,
      timezone: 'UTC',
      language: 'en'
    },
    network_monitoring: {
      enabled: false,
      interval: 300,
      timeout: 30,
      interface: 'auto',
      ip_ranges: '192.168.1.0/24',
      discovery_method: 'ping_arp',
      max_devices: 1000,
      traffic_analysis: false,
      packet_capture: false,
      capture_filter: 'tcp port 80 or tcp port 443',
      dns_monitoring: true,
      port_scan_detection: true,
      bandwidth_threshold: 100,
    },
    security_scanning: {
      enabled: false,
      interval: 3600,
      severity_threshold: 'medium',
    },
    notifications: {
      enabled: false,
      email: '',
      slack_webhook: '',
    },
    logging: {
      level: 'info',
      retention_days: 30,
      audit_enabled: true,
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