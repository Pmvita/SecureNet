import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse } from '../../../api/endpoints';
import axios from 'axios';

// Development mode bypass
const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

export interface NetworkDevice {
  id: string;
  name: string;
  type: 'router' | 'switch' | 'firewall' | 'server' | 'endpoint';
  status: 'online' | 'offline' | 'warning';
  ipAddress: string;
  macAddress: string;
  lastSeen: string;
  metrics: {
    latency: number;
    packetLoss: number;
    bandwidth: number;
  };
}

export interface NetworkConnection {
  id: string;
  sourceDevice: string;
  targetDevice: string;
  protocol: string;
  status: 'active' | 'blocked';
  lastSeen: string;
  metrics: {
    bytesTransferred: number;
    packetsTransferred: number;
    latency: number;
  };
}

export interface NetworkMetrics {
  totalDevices: number;
  activeDevices: number;
  totalConnections: number;
  activeConnections: number;
  blockedConnections: number;
  averageLatency: number;
  totalTraffic: number;
  bandwidthUsage: number;  // Current bandwidth usage in Mbps
  packetLoss: number;      // Current packet loss percentage
  protocols: Record<string, number>;
}

interface UseNetworkOptions {
  refreshInterval?: number;
}

interface NetworkResponseData {
  devices: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    last_seen: string;
  }>;
  connections: Array<{
    id: string;
    source_device: string;
    target_device: string;
    protocol: string;
    status: string;
    last_seen: string;
    bytes_transferred?: number;
    packets_transferred?: number;
    latency?: number;
  }>;
  traffic: Array<{
    timestamp: string;
    bytes_in: number;
    bytes_out: number;
    packets_in: number;
    packets_out: number;
  }>;
  protocols: Array<{
    name: string;
    count: number;
  }>;
  stats: {
    total_devices: number;
    active_devices: number;
    average_latency: number;
    total_traffic: number;
  };
}

type NetworkResponse = {
  status: string;
  data: NetworkResponseData;
  timestamp: string;
};

export const useNetwork = (options: UseNetworkOptions = {}) => {
  const queryClient = useQueryClient();
  const { refreshInterval = 30000 } = options;

  const {
    data: apiResponse,
    isLoading: isLoadingNetwork,
    isError: isNetworkError,
    error: networkError,
  } = useQuery({
    queryKey: ['network'],
    queryFn: async () => {
      // In development mode, return mock data
      if (DEV_MODE) {
        return {
          data: {
            status: 'success',
            data: {
              devices: [
                {
                  id: '1',
                  name: 'Router-01',
                  type: 'router',
                  status: 'online',
                  last_seen: new Date().toISOString()
                },
                {
                  id: '2',
                  name: 'Server-01',
                  type: 'server',
                  status: 'online',
                  last_seen: new Date().toISOString()
                }
              ],
              connections: [
                {
                  id: '1',
                  source_device: 'Router-01',
                  target_device: 'Server-01',
                  protocol: 'TCP',
                  status: 'active',
                  last_seen: new Date().toISOString(),
                  bytes_transferred: 1024000,
                  packets_transferred: 500,
                  latency: 10
                }
              ],
              traffic: [
                {
                  timestamp: new Date().toISOString(),
                  bytes_in: 50000,
                  bytes_out: 45000,
                  packets_in: 100,
                  packets_out: 95
                }
              ],
              protocols: [
                { name: 'TCP', count: 150 },
                { name: 'UDP', count: 75 },
                { name: 'HTTP', count: 100 }
              ],
              stats: {
                total_devices: 2,
                active_devices: 2,
                average_latency: 10,
                total_traffic: 95000
              }
            } as NetworkResponseData
          }
        };
      }

      try {
        const response = await apiClient.get<ApiResponse<NetworkResponseData>>('/api/network');
        if (!response.data) {
          throw new Error('No data received from the network endpoint');
        }
        if (response.data.status !== 'success') {
          throw new Error('Network request failed');
        }
        return response;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        if (axios.isAxiosError(error)) {
          throw new Error(error.response?.data?.message || error.message || 'Network request failed');
        }
        throw new Error('Failed to fetch network data');
      }
    },
    refetchInterval: DEV_MODE ? false : refreshInterval,
  });

  const responseData = apiResponse?.data?.data;
  const devices = responseData?.devices?.map((device: NetworkResponseData['devices'][0]) => ({
    id: device.id,
    name: device.name,
    type: device.type as NetworkDevice['type'],
    status: device.status as NetworkDevice['status'],
    ipAddress: '', // These fields are not in the API response
    macAddress: '', // These fields are not in the API response
    lastSeen: device.last_seen,
    metrics: {
      latency: 0, // These metrics are not in the API response
      packetLoss: 0,
      bandwidth: 0
    }
  })) ?? [];

  const connections = responseData?.connections?.map((conn: NetworkResponseData['connections'][0]) => ({
    id: conn.id,
    sourceDevice: conn.source_device,
    targetDevice: conn.target_device,
    protocol: conn.protocol,
    status: conn.status as NetworkConnection['status'],
    lastSeen: conn.last_seen,
    metrics: {
      bytesTransferred: conn.bytes_transferred ?? 0,
      packetsTransferred: conn.packets_transferred ?? 0,
      latency: conn.latency ?? 0
    }
  })) ?? [];

  // Calculate metrics from the response data
  const latestTraffic = responseData?.traffic?.[responseData.traffic.length - 1];
  const totalBytes = latestTraffic 
    ? (latestTraffic.bytes_in + latestTraffic.bytes_out) 
    : 0;
  const totalPackets = latestTraffic 
    ? (latestTraffic.packets_in + latestTraffic.packets_out) 
    : 0;
  const packetLoss = latestTraffic && latestTraffic.packets_out > 0
    ? ((latestTraffic.packets_out - latestTraffic.packets_in) / latestTraffic.packets_out) * 100
    : 0;

  const metrics = {
    totalDevices: responseData?.stats?.total_devices ?? 0,
    activeDevices: responseData?.stats?.active_devices ?? 0,
    totalConnections: connections.length,
    activeConnections: connections.filter(conn => conn.status === 'active').length,
    blockedConnections: connections.filter(conn => conn.status === 'blocked').length,
    averageLatency: responseData?.stats?.average_latency ?? 0,
    totalTraffic: responseData?.stats?.total_traffic ?? 0,
    bandwidthUsage: totalBytes / 1024 / 1024, // Convert to Mbps
    packetLoss: packetLoss,
    protocols: Object.fromEntries(
      (responseData?.protocols ?? []).map((p: NetworkResponseData['protocols'][0]) => [p.name, p.count])
    )
  };

  const blockConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>(`/api/network/connections/${connectionId}/block`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });

  const unblockConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>(`/api/network/connections/${connectionId}/unblock`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });

  const scanNetwork = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ApiResponse<{ id: string; status: string }>>('/api/network/scan');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });

  return {
    devices,
    connections,
    metrics,
    isLoading: isLoadingNetwork,
    isError: isNetworkError,
    error: networkError,
    blockConnection: blockConnection.mutateAsync,
    unblockConnection: unblockConnection.mutateAsync,
    scanNetwork: scanNetwork.mutateAsync,
    isBlocking: blockConnection.isPending,
    isUnblocking: unblockConnection.isPending,
    isScanning: scanNetwork.isPending,
  };
}; 