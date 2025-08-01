import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNetwork, type NetworkConnection } from '../api/useNetwork';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow, format } from 'date-fns';
import { ErrorBoundary } from 'react-error-boundary';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { FixedSizeList as List } from 'react-window';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  XMarkIcon,
  ServerIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentTextIcon,
  FireIcon,
  BoltIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import NetworkFlowDiagram from '@/components/network/NetworkFlowDiagram';

// Dynamic import for vis-network with fallback
let VisNetwork: any = null;
let visNetworkLoaded = false;

const loadVisNetwork = async () => {
  if (visNetworkLoaded) return VisNetwork;
  
  try {
    const visModule = await import('vis-network');
    VisNetwork = visModule.Network;
    visNetworkLoaded = true;
    return VisNetwork;
  } catch (error) {
    console.error('Failed to load vis-network:', error);
    return null;
  }
};

// Traffic log interface
interface TrafficLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  packetSize: number;
  direction: 'inbound' | 'outbound';
  status: 'allowed' | 'blocked' | 'flagged';
  application?: string;
  country?: string;
}

// NetworkDevice interface that matches backend response
interface NetworkDevice {
  id: string;
  name: string;
  type: 'server' | 'workstation' | 'mobile' | 'router' | 'switch';
  status: 'online' | 'offline' | 'warning';
  ip: string;
  mac: string;
  lastSeen: string;
  connections: string[];
  metadata: {
    os?: string;
    vendor?: string;
    location?: string;
    services?: string[];
  };
}

// Enhanced traffic interface for new API
interface NetworkTraffic {
  id: string;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  protocol: string;
  port: number;
  bytes_in: number;
  bytes_out: number;
  packets_in: number;
  packets_out: number;
  status: 'active' | 'completed' | 'timeout';
  connection_duration: number;
  threat_level: 'low' | 'medium' | 'high';
  application: string;
}

interface TrafficSummary {
  total_connections: number;
  active_connections: number;
  total_bytes_transferred: number;
  top_protocols: Array<{
    protocol: string;
    count: number;
  }>;
}

// Device type icons mapping
const deviceTypeIcons = {
  router: GlobeAltIcon,
  switch: WifiIcon,
  firewall: ShieldExclamationIcon,
  server: ServerIcon,
  endpoint: ComputerDesktopIcon,
  mobile: DevicePhoneMobileIcon,
};

// Status indicators
const statusConfig = {
  online: { 
    variant: 'success' as const, 
    icon: CheckCircleIcon, 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10 border-green-400/20'
  },
  offline: { 
    variant: 'error' as const, 
    icon: XMarkIcon, 
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/20'
  },
  warning: { 
    variant: 'warning' as const, 
    icon: ExclamationTriangleIcon, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/20'
  },
};

// Protocol colors
const protocolColors = {
  HTTP: 'text-blue-400 bg-blue-400/10',
  HTTPS: 'text-blue-500 bg-blue-500/10',
  SSH: 'text-purple-400 bg-purple-400/10',
  FTP: 'text-orange-400 bg-orange-400/10',
  DNS: 'text-green-400 bg-green-400/10',
  SMTP: 'text-yellow-400 bg-yellow-400/10',
  TCP: 'text-cyan-400 bg-cyan-400/10',
  UDP: 'text-pink-400 bg-pink-400/10',
  default: 'text-gray-400 bg-gray-400/10',
};

// API functions
async function fetchNetworkDevices(): Promise<NetworkDevice[]> {
  try {
    const response = await apiClient.get('/api/network/devices');
    return response.data || response; // Handle both wrapped and unwrapped responses
  } catch (error) {
    console.error('Error fetching network devices:', error);
    throw error;
  }
}

async function fetchNetworkStats(): Promise<{
  totalDevices: number;
  onlineDevices: number;
  activeConnections: number;
  bandwidthUsage: {
    incoming: number;
    outgoing: number;
  };
}> {
  try {
    const response = await apiClient.get('/api/network/stats');
    return response.data || response; // Handle both wrapped and unwrapped responses
  } catch (error) {
    console.error('Error fetching network stats:', error);
    throw error;
  }
}

async function fetchNetworkTraffic(): Promise<{ traffic: NetworkTraffic[]; summary: TrafficSummary }> {
  try {
    const response = await apiClient.get('/api/network/traffic');
    return response.data || response; // Handle both wrapped and unwrapped responses
  } catch (error) {
    console.error('Error fetching network traffic:', error);
    throw error;
  }
}

// Fallback component for when vis-network is not available
const NetworkFallback = ({ devices }: { devices: NetworkDevice[] }) => (
  <div className="space-y-4">
    <div className="text-center py-8">
      <GlobeAltIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Network Visualization Unavailable</h3>
      <p className="text-gray-400 mb-4">Interactive network visualization is not supported in this browser.</p>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.map((device) => (
        <div key={device.id} className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: deviceTypeIcons[device.type] ? '#6B7280' : '#6B7280',
                border: `2px solid ${
                  device.status === 'online' ? '#10B981' : 
                  device.status === 'warning' ? '#F59E0B' : '#EF4444'
                }`
              }}
            />
            <div className="flex-1">
              <h4 className="font-medium text-white">{device.name}</h4>
              <p className="text-sm text-gray-400">{device.ip}</p>
              <p className="text-xs text-gray-500 capitalize">{device.type}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs ${
              device.status === 'online'
                ? 'bg-green-500/10 text-green-500'
                : device.status === 'warning'
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-red-500/10 text-red-500'
            }`}>
              {device.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Traffic Monitor Component
const LiveTrafficMonitor = ({ traffic, summary }: { traffic: NetworkTraffic[]; summary: TrafficSummary }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-500 bg-red-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'HTTP':
      case 'HTTPS': return 'text-blue-500 bg-blue-500/10';
      case 'SSH': return 'text-purple-500 bg-purple-500/10';
      case 'DNS': return 'text-green-500 bg-green-500/10';
      case 'FTP': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Traffic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Connections</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.total_connections}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ChartBarIcon className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Connections</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.active_connections}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <ArrowPathIcon className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Data Transferred</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatBytes(summary.total_bytes_transferred)}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <GlobeAltIcon className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Top Protocol</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {summary.top_protocols[0]?.protocol || 'N/A'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ClockIcon className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Distribution */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-white mb-4">Protocol Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summary.top_protocols.map((protocol) => (
            <div key={protocol.protocol} className="text-center">
              <div className="text-2xl font-bold text-white">{protocol.count}</div>
              <div className="text-sm text-gray-400">{protocol.protocol}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Traffic Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Live Traffic Monitor</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Source</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Destination</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Protocol</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Data</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Duration</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Threat</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {traffic.slice(0, 20).map((entry) => (
                <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300 font-mono">{entry.source_ip}</td>
                  <td className="py-3 px-4 text-sm text-gray-300 font-mono">{entry.dest_ip}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getProtocolColor(entry.protocol)}`}>
                      {entry.protocol}:{entry.port}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    <div>
                      <div>↓ {formatBytes(entry.bytes_in)}</div>
                      <div>↑ {formatBytes(entry.bytes_out)}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {formatDuration(entry.connection_duration)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getThreatLevelColor(entry.threat_level)}`}>
                      {entry.threat_level}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      entry.status === 'active' 
                        ? 'bg-green-500/10 text-green-500' 
                        : entry.status === 'completed'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Network Error</h2>
        <p className="text-gray-400 mb-4">{error.message}</p>
        <Button onClick={resetErrorBoundary} variant="primary">
          Try Again
        </Button>
      </div>
    </div>
  );
}

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const NetworkPage: React.FC = () => {
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [network, setNetwork] = useState<any>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [visNetworkAvailable, setVisNetworkAvailable] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'topology' | 'traffic'>('topology');
  const networkRef = useRef<HTMLDivElement>(null);

  // Query for network devices
  const { data: devices, isLoading: devicesLoading, error: devicesError } = useQuery({
    queryKey: ['networkDevices'],
    queryFn: fetchNetworkDevices,
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    retryDelay: 1000,
  });

  // Query for network stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['networkStats'],
    queryFn: fetchNetworkStats,
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    retryDelay: 1000,
  });

  // Query for network traffic
  const { data: trafficData, isLoading: trafficLoading, error: trafficError } = useQuery({
    queryKey: ['networkTraffic'],
    queryFn: fetchNetworkTraffic,
    refetchInterval: 10000, // More frequent updates for traffic
    staleTime: 5000,
    retry: 3,
    retryDelay: 1000,
  });

  // Check vis-network availability on mount
  useEffect(() => {
    const checkVisNetwork = async () => {
      const VisNetworkModule = await loadVisNetwork();
      if (!VisNetworkModule) {
        setVisNetworkAvailable(false);
      }
    };
    checkVisNetwork();
  }, []);

  // Initialize network visualization with error handling
  const initializeNetwork = useCallback(async () => {
    if (!networkRef.current || !devices || !visNetworkAvailable) return;

    try {
      const VisNetworkModule = await loadVisNetwork();
      if (!VisNetworkModule) {
        setVisNetworkAvailable(false);
        return;
      }

      // Clean up existing network
      if (network) {
        network.destroy();
      }

      const nodes = devices.map(device => ({
        id: device.id,
        label: device.name,
        title: `${device.name}\n${device.ip}\n${device.type}`,
        color: {
          background: '#6B7280',
          border: device.status === 'online' ? '#10B981' : device.status === 'warning' ? '#F59E0B' : '#EF4444',
          highlight: {
            background: '#6B7280',
            border: '#3B82F6',
          },
        },
        shape: 'dot',
        size: 20,
        font: {
          color: '#FFFFFF',
          size: 12,
          face: 'Arial',
        },
      }));

      const edges = devices.flatMap(device =>
        device.connections?.map(targetId => ({
          from: device.id,
          to: targetId,
          arrows: 'to',
          smooth: {
            enabled: true,
            type: 'curvedCW',
            roundness: 0.2,
          },
          color: {
            color: 'rgba(255, 255, 255, 0.3)',
            highlight: '#3B82F6',
            hover: '#3B82F6',
          },
          width: 2,
        })) || []
      );

      const data = { nodes, edges };
      const options = {
        nodes: {
          font: {
            color: '#FFFFFF',
            size: 12,
            face: 'Arial',
          },
          borderWidth: 2,
          shadow: true,
        },
        edges: {
          color: {
            color: 'rgba(255, 255, 255, 0.3)',
            highlight: '#3B82F6',
            hover: '#3B82F6',
          },
          width: 2,
          shadow: true,
        },
        physics: {
          enabled: true,
          stabilization: {
            enabled: true,
            iterations: 100,
            updateInterval: 25,
          },
          barnesHut: {
            gravitationalConstant: -2000,
            springLength: 200,
            springConstant: 0.04,
            damping: 0.09,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true,
        },
        layout: {
          improvedLayout: true,
        },
      };

      const visNetwork = new VisNetworkModule(networkRef.current, data, options);

      visNetwork.on('click', (params: any) => {
        if (params.nodes.length > 0) {
          const deviceId = params.nodes[0];
          const device = devices.find(d => d.id === deviceId);
          setSelectedDevice(device || null);
        } else {
          setSelectedDevice(null);
        }
      });

      visNetwork.on('stabilizationProgress', (params: any) => {
        // Optional: Add progress indicator
      });

      visNetwork.on('stabilizationIterationsDone', () => {
        setNetworkError(null);
      });

      setNetwork(visNetwork);
      setNetworkError(null);

    } catch (error) {
      console.error('Error initializing network visualization:', error);
      setNetworkError('Failed to initialize network visualization');
      setVisNetworkAvailable(false);
    }
  }, [devices, network, visNetworkAvailable]);

  useEffect(() => {
    initializeNetwork();
  }, [initializeNetwork]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (network) {
        try {
          network.destroy();
        } catch (error) {
          console.error('Error destroying network:', error);
        }
      }
    };
  }, [network]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (network) {
        try {
          network.fit();
        } catch (error) {
          console.error('Error handling resize:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [network]);

  // Error handling
  if (devicesError || statsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-white">Network Overview</h1>
        </div>
        
        <div className="glass-card p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Network Data Unavailable</h2>
          <p className="text-gray-400 mb-4">
            {devicesError ? 'Failed to load network devices' : 'Failed to load network statistics'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Network Overview</h1>
        <div className="flex items-center space-x-2">
          {devicesLoading && (
            <div className="flex items-center text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
              Updating...
            </div>
          )}
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="glass-card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Devices</p>
              <div className="mt-2 text-2xl lg:text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.totalDevices ?? 0
                )}
              </div>
            </div>
            <div className="p-2 lg:p-3 rounded-lg bg-primary-500/10">
              <GlobeAltIcon className="h-5 w-5 lg:h-6 lg:w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Online Devices</p>
              <div className="mt-2 text-2xl lg:text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.onlineDevices ?? 0
                )}
              </div>
            </div>
            <div className="p-2 lg:p-3 rounded-lg bg-green-500/10">
              <ServerIcon className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Connections</p>
              <div className="mt-2 text-2xl lg:text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.activeConnections ?? 0
                )}
              </div>
            </div>
            <div className="p-2 lg:p-3 rounded-lg bg-blue-500/10">
              <ComputerDesktopIcon className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Bandwidth Usage</p>
              <p className="mt-2 text-sm text-gray-300">
                In: {statsLoading ? '-' : `${(stats?.bandwidthUsage.incoming ?? 0).toFixed(1)} MB/s`}
              </p>
              <p className="text-sm text-gray-300">
                Out: {statsLoading ? '-' : `${(stats?.bandwidthUsage.outgoing ?? 0).toFixed(1)} MB/s`}
              </p>
            </div>
            <div className="p-2 lg:p-3 rounded-lg bg-purple-500/10">
              <DevicePhoneMobileIcon className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-dark-100/50 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('topology')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'topology'
              ? 'bg-primary-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Network Topology
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'traffic'
              ? 'bg-primary-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Live Traffic Monitor
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'topology' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Network Topology</h2>
                {networkError && (
                  <div className="flex items-center text-sm text-red-400">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {networkError}
                  </div>
                )}
              </div>
              
              {!visNetworkAvailable && devices ? (
                <NetworkFallback devices={devices} />
              ) : (
                <div 
                  ref={networkRef} 
                  className="h-[400px] lg:h-[600px] w-full rounded-lg bg-dark-100/50"
                  style={{ minHeight: '400px' }}
                />
              )}
              
              {devicesLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-100/80 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-400">Loading network data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Device Details */}
          <div className="glass-card p-4 lg:p-6">
            <h2 className="text-lg font-medium text-white mb-4">Device Details</h2>
            {selectedDevice ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Device Information</h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Name:</span> {selectedDevice.name}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Type:</span> {selectedDevice.type}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Status:</span>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedDevice.status === 'online'
                          ? 'bg-green-500/10 text-green-500'
                          : selectedDevice.status === 'warning'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {selectedDevice.status}
                      </span>
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">IP Address:</span> {selectedDevice.ip}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">MAC Address:</span> {selectedDevice.mac}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Last Seen:</span>{' '}
                      {new Date(selectedDevice.lastSeen).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedDevice.metadata?.os && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">System Information</h3>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-300">
                        <span className="text-gray-400">OS:</span> {selectedDevice.metadata.os}
                      </p>
                      {selectedDevice.metadata.vendor && (
                        <p className="text-sm text-gray-300">
                          <span className="text-gray-400">Vendor:</span> {selectedDevice.metadata.vendor}
                        </p>
                      )}
                      {selectedDevice.metadata.location && (
                        <p className="text-sm text-gray-300">
                          <span className="text-gray-400">Location:</span> {selectedDevice.metadata.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedDevice.metadata?.services && selectedDevice.metadata.services.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Active Services</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDevice.metadata.services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 rounded-full text-xs bg-primary-500/10 text-primary-500"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-400">Connected Devices</h3>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {selectedDevice.connections?.map((deviceId) => {
                      const connectedDevice = devices?.find(d => d.id === deviceId);
                      return connectedDevice ? (
                        <div
                          key={deviceId}
                          className="flex items-center justify-between p-2 rounded-lg bg-dark-100/50"
                        >
                          <div>
                            <p className="text-sm text-gray-300">{connectedDevice.name}</p>
                            <p className="text-xs text-gray-400">{connectedDevice.ip}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            connectedDevice.status === 'online'
                              ? 'bg-green-500/10 text-green-500'
                              : connectedDevice.status === 'warning'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {connectedDevice.status}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <GlobeAltIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Select a device to view details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {trafficLoading ? (
            <div className="glass-card p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading traffic data...</p>
            </div>
          ) : trafficError ? (
            <div className="glass-card p-8 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Traffic Data Unavailable</h2>
              <p className="text-gray-400 mb-4">Failed to load network traffic data</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : trafficData ? (
            <LiveTrafficMonitor traffic={trafficData.traffic} summary={trafficData.summary} />
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-gray-400">No traffic data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 