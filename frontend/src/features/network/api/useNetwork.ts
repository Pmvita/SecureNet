import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { ApiResponse } from '../../../api/endpoints';
import axios from 'axios';

  // Development mode bypass - force real API mode
  const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';
  console.log('useNetwork: DEV_MODE =', DEV_MODE, 'VITE_MOCK_DATA =', import.meta.env.VITE_MOCK_DATA);

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
  traffic?: Array<{
    timestamp: string;
    bytes_in: number;
    bytes_out: number;
    packets_in: number;
    packets_out: number;
    source_ip: string;
    dest_ip: string;
    protocol: string;
    metadata?: Record<string, unknown>;
  }>;
}

interface UseNetworkOptions {
  refreshInterval?: number;
}

interface NetworkResponseData {
  devices: Array<{
    id: number;
    name: string;
    type: string;
    status: string;
    last_seen: string;
    metadata?: Record<string, unknown>;
  }>;
  traffic: Array<{
    timestamp: string;
    bytes_in: number;
    bytes_out: number;
    packets_in: number;
    packets_out: number;
    source_ip: string;
    dest_ip: string;
    protocol: string;
    metadata?: Record<string, unknown>;
  }>;
  protocols: Array<{
    name: string;
    count: number;
    percentage?: number;
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
                  id: 1,
                  name: 'Router-01',
                  type: 'router',
                  status: 'active',
                  last_seen: new Date().toISOString()
                },
                {
                  id: 2,
                  name: 'Server-01',
                  type: 'server',
                  status: 'active',
                  last_seen: new Date().toISOString()
                }
              ],
              traffic: [
                {
                  timestamp: new Date().toISOString(),
                  bytes_in: 50000,
                  bytes_out: 45000,
                  packets_in: 100,
                  packets_out: 95,
                  source_ip: '192.168.1.1',
                  dest_ip: '192.168.1.2',
                  protocol: 'TCP',
                  metadata: {}
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
        console.log('Network API: Making request to /api/network');
        const response = await apiClient.get<ApiResponse<NetworkResponseData>>('/api/network');
        console.log('Network API: Response received', response);
        
        if (!response || !response.data) {
          console.error('Network API: No data received from the network endpoint');
          throw new Error('No data received from the network endpoint');
        }
        
        if (response.status !== 'success') {
          console.error('Network API: Request failed with status', response.status);
          throw new Error('Network request failed');
        }
        
        console.log('Network API: Success, returning data');
        return response;
      } catch (error) {
        console.error('Network API: Error caught', error);
        if (error instanceof Error) {
          throw error;
        }
        if (axios.isAxiosError(error)) {
          console.error('Network API: Axios error', error.response?.data, error.message);
          throw new Error(error.response?.data?.message || error.message || 'Network request failed');
        }
        throw new Error('Failed to fetch network data');
      }
    },
    refetchInterval: DEV_MODE ? false : refreshInterval,
  });

  const responseData = apiResponse?.data?.data;
  const devices = responseData?.devices?.map((device: NetworkResponseData['devices'][0]) => ({
    id: device.id.toString(),
    name: device.name,
    type: device.type as NetworkDevice['type'],
    status: (device.status === 'active' ? 'online' : device.status === 'inactive' ? 'offline' : 'warning') as NetworkDevice['status'],
    ipAddress: (device.metadata as { ip?: string })?.ip || '', // Get IP from metadata
    macAddress: (device.metadata as { mac?: string })?.mac || '', // Get MAC from metadata
    lastSeen: device.last_seen,
    metrics: {
      latency: Math.random() * 100, // Generate sample metrics
      packetLoss: Math.random() * 5,
      bandwidth: Math.random() * 1000
    }
  })) ?? [];

  // Since connections are not provided by the API, use empty array
  const connections: NetworkConnection[] = [];

  // Calculate metrics from the response data
  const trafficData = responseData?.traffic ?? [];
  const totalTrafficBytes = trafficData.reduce((sum, traffic) => 
    sum + traffic.bytes_in + traffic.bytes_out, 0
  );
  const totalTrafficPackets = trafficData.reduce((sum, traffic) => 
    sum + traffic.packets_in + traffic.packets_out, 0
  );
  
  // Calculate bandwidth usage in Mbps (assume data is over recent period)
  const bandwidthMbps = totalTrafficBytes > 0 ? (totalTrafficBytes / 1024 / 1024) : 0;
  
  // Calculate packet loss as percentage
  const totalInPackets = trafficData.reduce((sum, traffic) => sum + traffic.packets_in, 0);
  const totalOutPackets = trafficData.reduce((sum, traffic) => sum + traffic.packets_out, 0);
  const packetLossPercentage = totalOutPackets > 0 
    ? Math.max(0, ((totalOutPackets - totalInPackets) / totalOutPackets) * 100)
    : 0;

  const metrics = {
    totalDevices: responseData?.stats?.total_devices ?? 0,
    activeDevices: responseData?.stats?.active_devices ?? 0,
    totalConnections: connections.length,
    activeConnections: connections.filter(conn => conn.status === 'active').length,
    blockedConnections: connections.filter(conn => conn.status === 'blocked').length,
    averageLatency: responseData?.stats?.average_latency ?? 0,
    totalTraffic: totalTrafficBytes,
    bandwidthUsage: bandwidthMbps,
    packetLoss: packetLossPercentage,
    protocols: Object.fromEntries(
      (responseData?.protocols ?? []).map((p: NetworkResponseData['protocols'][0]) => [p.name, p.count])
    ),
    traffic: trafficData // Include real traffic data
  };

  console.log('useNetwork: apiResponse =', apiResponse);
  console.log('useNetwork: responseData =', responseData);
  console.log('useNetwork: devices count =', devices.length);
  console.log('useNetwork: metrics =', metrics);

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