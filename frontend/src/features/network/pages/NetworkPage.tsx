import React, { useState, useMemo, useEffect } from 'react';
import { useNetwork, type NetworkDevice, type NetworkConnection } from '../api/useNetwork';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow, format } from 'date-fns';
import { ErrorBoundary } from 'react-error-boundary';
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
const protocolConfig = {
  HTTP: { color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  HTTPS: { color: 'text-green-400', bgColor: 'bg-green-400/10' },
  TCP: { color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
  UDP: { color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
  FTP: { color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
  SSH: { color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  DNS: { color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
  ICMP: { color: 'text-red-400', bgColor: 'bg-red-400/10' },
};

// Traffic status config
const trafficStatusConfig = {
  allowed: { variant: 'success' as const, color: 'text-green-400', icon: CheckCircleIcon },
  blocked: { variant: 'error' as const, color: 'text-red-400', icon: XMarkIcon },
  flagged: { variant: 'warning' as const, color: 'text-yellow-400', icon: ExclamationTriangleIcon },
};

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 p-6">
      <Card className="w-full max-w-md">
        <div className="text-center p-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Network Component Error</h2>
          <p className="text-gray-400 mb-4 text-sm">{error.message}</p>
          <Button
            variant="primary"
            onClick={resetErrorBoundary}
            className="w-full"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Device Table Column Helper
const deviceColumnHelper = createColumnHelper<NetworkDevice>();

// Traffic Log Row Component for react-window
const TrafficLogRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: TrafficLog[] }) => {
  const log = data[index];
  
  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div style={style} className="flex items-center border-b border-gray-700/50 px-6 py-3 text-sm hover:bg-gray-800/30">
      <div className="w-32 flex-shrink-0 text-gray-400">
        {format(new Date(log.timestamp), 'HH:mm:ss')}
      </div>
      <div className="w-40 flex-shrink-0 font-mono text-white">
        {log.sourceIp}:{log.sourcePort}
      </div>
      <div className="w-40 flex-shrink-0 font-mono text-white">
        {log.destinationIp}:{log.destinationPort}
      </div>
      <div className="w-20 flex-shrink-0 text-gray-300 uppercase">
        {log.protocol}
      </div>
      <div className="w-24 flex-shrink-0 text-gray-300">
        {formatBytes(log.packetSize)}
      </div>
      <div className="w-24 flex-shrink-0">
        <Badge 
          variant={log.direction === 'inbound' ? 'info' : 'default'}
          className="text-xs"
        >
          {log.direction === 'inbound' ? (
            <ArrowDownIcon className="h-3 w-3 mr-1" />
          ) : (
            <ArrowUpIcon className="h-3 w-3 mr-1" />
          )}
          {log.direction}
        </Badge>
      </div>
      <div className="w-24 flex-shrink-0">
        <Badge 
          variant={
            log.status === 'allowed' ? 'success' : 
            log.status === 'blocked' ? 'error' : 'warning'
          }
          className="text-xs"
        >
          {log.status}
        </Badge>
      </div>
      <div className="flex-1 text-gray-400 truncate">
        {log.application || 'Unknown'}
      </div>
    </div>
  );
});

export const NetworkPage: React.FC = () => {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'block' | 'unblock' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  
  // Traffic logs state
  const [trafficLogs, setTrafficLogs] = useState<TrafficLog[]>([]);
  const [isTrafficMonitoring, setIsTrafficMonitoring] = useState(true);
  const [trafficFilter, setTrafficFilter] = useState<string>('all');
  const [trafficStatusFilter, setTrafficStatusFilter] = useState<string>('all');
  const [trafficSearchTerm, setTrafficSearchTerm] = useState('');
  
  const { toast } = useToast();

  const {
    devices,
    connections,
    metrics,
    isLoading,
    isError,
    error,
    blockConnection,
    unblockConnection,
    scanNetwork,
    isBlocking,
    isUnblocking,
    isScanning,
  } = useNetwork();

  console.log('NetworkPage: isLoading =', isLoading, 'isError =', isError, 'devices.length =', devices.length, 'metrics =', metrics);

  // Development mode check
  const DEV_MODE = import.meta.env.VITE_MOCK_DATA === 'true';

  // Generate mock traffic logs (only for mock mode)
  const generateTrafficLog = (): TrafficLog => {
    const protocols = ['HTTP', 'HTTPS', 'TCP', 'UDP', 'FTP', 'SSH', 'DNS', 'ICMP'];
    const applications = ['Chrome', 'Firefox', 'Slack', 'Zoom', 'Teams', 'Spotify', 'Steam', 'WhatsApp'];
    const countries = ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'AU', 'SG'];
    const statuses: TrafficLog['status'][] = ['allowed', 'allowed', 'allowed', 'blocked', 'flagged'];
    
    const sourceIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const destinationIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      sourceIp,
      destinationIp,
      sourcePort: Math.floor(Math.random() * 65535),
      destinationPort: Math.floor(Math.random() * 65535),
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      packetSize: Math.floor(Math.random() * 1500) + 64,
      direction: Math.random() > 0.5 ? 'inbound' : 'outbound',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      application: Math.random() > 0.3 ? applications[Math.floor(Math.random() * applications.length)] : undefined,
      country: countries[Math.floor(Math.random() * countries.length)],
    };
  };

  // Convert real traffic data to TrafficLog format
  const convertTrafficToLogs = (trafficData: Array<{
    timestamp: string;
    bytes_in: number;
    bytes_out: number;
    packets_in: number;
    packets_out: number;
    source_ip: string;
    dest_ip: string;
    protocol: string;
    metadata?: Record<string, unknown>;
  }>): TrafficLog[] => {
    return trafficData.map((traffic, index) => ({
      id: `traffic-${index}-${Date.now()}`,
      timestamp: traffic.timestamp,
      sourceIp: traffic.source_ip,
      destinationIp: traffic.dest_ip,
      sourcePort: 0, // Not provided in current API
      destinationPort: (traffic.metadata as { port?: number })?.port || 0,
      protocol: traffic.protocol,
      packetSize: traffic.bytes_in + traffic.bytes_out,
      direction: Math.random() > 0.5 ? 'inbound' : 'outbound',
      status: 'allowed' as const,
      application: undefined,
      country: undefined,
    }));
  };

  // Handle traffic logs based on mode
  useEffect(() => {
    if (DEV_MODE) {
      // Mock mode - generate simulated traffic
      if (!isTrafficMonitoring) return;

      const interval = setInterval(() => {
        const newLog = generateTrafficLog();
        setTrafficLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep last 200 logs
      }, Math.random() * 2000 + 500); // Random interval between 500ms-2.5s

      return () => clearInterval(interval);
    } else {
      // Real API mode - use traffic data from backend
      if (metrics?.traffic && metrics.traffic.length > 0) {
        const realTrafficLogs = convertTrafficToLogs(metrics.traffic);
        setTrafficLogs(realTrafficLogs); // Replace with real data
      }
    }
  }, [isTrafficMonitoring, DEV_MODE, metrics?.traffic]);

  // Initialize traffic logs
  useEffect(() => {
    if (DEV_MODE) {
      // Mock mode - generate initial logs
      const initialLogs = Array.from({ length: 20 }, () => generateTrafficLog());
      setTrafficLogs(initialLogs);
    } else {
      // Real API mode - start with empty logs, will be populated from backend data
      setTrafficLogs([]);
    }
  }, [DEV_MODE]);

  // Filter devices based on search and filters
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (device.ipAddress || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = deviceFilter === 'all' || device.type === deviceFilter;
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [devices, searchTerm, deviceFilter, statusFilter]);

  // Filter connections based on search
  const filteredConnections = useMemo(() => {
    return connections.filter(connection => 
      connection.sourceDevice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      connection.targetDevice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      connection.protocol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [connections, searchTerm]);

  // Filter traffic logs
  const filteredTrafficLogs = useMemo(() => {
    return trafficLogs.filter(log => {
      const matchesSearch = 
        log.sourceIp.includes(trafficSearchTerm) ||
        log.destinationIp.includes(trafficSearchTerm) ||
        log.protocol.toLowerCase().includes(trafficSearchTerm.toLowerCase()) ||
        log.application?.toLowerCase().includes(trafficSearchTerm.toLowerCase());
      
      const matchesProtocol = trafficFilter === 'all' || log.protocol === trafficFilter;
      const matchesStatus = trafficStatusFilter === 'all' || log.status === trafficStatusFilter;
      
      return matchesSearch && matchesProtocol && matchesStatus;
    });
  }, [trafficLogs, trafficSearchTerm, trafficFilter, trafficStatusFilter]);

  // Calculate traffic statistics
  const trafficStats = useMemo(() => {
    const last100 = trafficLogs.slice(0, 100);
    return {
      totalPackets: last100.length,
      blockedPackets: last100.filter(log => log.status === 'blocked').length,
      flaggedPackets: last100.filter(log => log.status === 'flagged').length,
      inboundPackets: last100.filter(log => log.direction === 'inbound').length,
      outboundPackets: last100.filter(log => log.direction === 'outbound').length,
      topProtocols: Object.entries(
        last100.reduce((acc, log) => {
          acc[log.protocol] = (acc[log.protocol] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort(([,a], [,b]) => b - a).slice(0, 5),
    };
  }, [trafficLogs]);

  const handleBlockConnection = async (connectionId: string) => {
    try {
      await blockConnection(connectionId);
      setSelectedConnection(null);
      setActionType(null);
      toast({
        title: 'Connection blocked successfully',
        description: 'The network connection has been blocked.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to block connection',
        description: 'An error occurred while blocking the connection.',
        variant: 'error',
      });
    }
  };

  const handleUnblockConnection = async (connectionId: string) => {
    try {
      await unblockConnection(connectionId);
      setSelectedConnection(null);
      setActionType(null);
      toast({
        title: 'Connection unblocked successfully',
        description: 'The network connection has been unblocked.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to unblock connection',
        description: 'An error occurred while unblocking the connection.',
        variant: 'error',
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedConnection || !actionType) return;
    
    try {
      if (actionType === 'block') {
        await handleBlockConnection(selectedConnection);
      } else if (actionType === 'unblock') {
        await handleUnblockConnection(selectedConnection);
      }
    } catch (error) {
      // Error handling is already done in the individual functions
      console.error('Action confirmation error:', error);
    }
  };

  const handleScanNetwork = async () => {
    try {
      await scanNetwork();
      toast({
        title: 'Network scan started',
        description: 'Scanning network for devices and connections...',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to start network scan',
        description: 'An error occurred while starting the network scan.',
        variant: 'error',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatLatency = (latency: number) => {
    return `${latency.toFixed(1)}ms`;
  };

  const toggleTrafficMonitoring = () => {
    setIsTrafficMonitoring(!isTrafficMonitoring);
    toast({
      title: isTrafficMonitoring ? 'Traffic monitoring paused' : 'Traffic monitoring resumed',
      description: isTrafficMonitoring ? 'Live traffic updates stopped' : 'Live traffic updates started',
      variant: 'info',
    });
  };

  // Device table columns definition
  const deviceColumns = useMemo<ColumnDef<NetworkDevice, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Device Name',
        cell: ({ getValue, row }) => {
          const device = row.original;
          const DeviceIcon = deviceTypeIcons[device.type as keyof typeof deviceTypeIcons] || ServerIcon;
          return (
            <div className="flex items-center space-x-3">
              <DeviceIcon className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-white">{String(getValue() || "")}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP Address',
        cell: ({ getValue }) => (
          <span className="font-mono text-gray-300">{String(getValue() || "N/A")}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (
          <span className="capitalize text-gray-300">{String(getValue() || "")}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue();
          const statusInfo = statusConfig[status as keyof typeof statusConfig];
          const StatusIcon = statusInfo?.icon || CheckCircleIcon;
          return (
            <Badge variant={statusInfo?.variant || 'default'} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {String(status || "")}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'lastSeen',
        header: 'Last Seen',
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-400">
            {formatDistanceToNow(new Date(String(getValue() || "")))} ago
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedDevice(row.original);
              setShowDeviceDetails(true);
            }}
            className="text-xs"
          >
            <EyeIcon className="h-3 w-3 mr-1" />
            View
          </Button>
        ),
      },
    ],
    []
  );

  // Device table configuration
  const deviceTable = useReactTable({
    data: filteredDevices,
    columns: deviceColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isError) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred while loading network data';

    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center p-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Network Error</h2>
            <p className="text-gray-400 mb-4">{errorMessage}</p>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <p className="mt-4 text-gray-400">Loading network data...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Network Monitoring</h1>
            <p className="text-gray-400 mt-1">Real-time network infrastructure and traffic analysis</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={handleScanNetwork}
              disabled={isScanning}
              className="flex items-center gap-2"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  Scan Network
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-400">Total Devices</p>
                    <p className="text-2xl font-bold text-white mt-1">{metrics.totalDevices}</p>
                  </div>
                  <ServerIcon className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-400">Active Devices</p>
                    <p className="text-2xl font-bold text-white mt-1">{metrics.activeDevices}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-400">Active Connections</p>
                    <p className="text-2xl font-bold text-white mt-1">{metrics.activeConnections}</p>
                  </div>
                  <WifiIcon className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-400">Blocked Connections</p>
                    <p className="text-2xl font-bold text-white mt-1">{metrics.blockedConnections}</p>
                  </div>
                  <ShieldExclamationIcon className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-400">Threats Detected</p>
                    <p className="text-2xl font-bold text-white mt-1">{trafficStats.blockedPackets + trafficStats.flaggedPackets}</p>
                  </div>
                  <FireIcon className="h-8 w-8 text-red-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-400">Bandwidth Usage</p>
                    <p className="text-2xl font-bold text-white mt-1">{metrics.bandwidthUsage.toFixed(1)}%</p>
                  </div>
                  <SignalIcon className="h-8 w-8 text-indigo-400" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Phase 3: Enterprise Network Visualization */}
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Enterprise Network Topology</h2>
              <p className="text-sm text-gray-400 mt-1">Interactive network visualization with real-time threat detection</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Phase 3</span>
              <span>Enterprise Components</span>
            </div>
          </div>

          {/* Network Flow Diagram */}
          <NetworkFlowDiagram height={600} className="w-full" />
        </div>

        {/* Enhanced Traffic Monitoring Section */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/30 to-gray-700/30">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-green-400" />
                  Live Traffic Monitor
                  <Button
                    size="sm"
                    variant={isTrafficMonitoring ? "warning" : "success"}
                    onClick={toggleTrafficMonitoring}
                    className="ml-4 px-3 py-1 text-xs"
                  >
                    {isTrafficMonitoring ? (
                      <>
                        <PauseIcon className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-3 w-3 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isTrafficMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-gray-400">
                    {isTrafficMonitoring ? 'Live' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Traffic Statistics */}
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/30 to-gray-700/30">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-center mb-2">
                    <DocumentTextIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-blue-400">{trafficStats.totalPackets}</div>
                  <div className="text-sm text-gray-300 font-medium">Total Packets</div>
                  <div className="text-xs text-gray-500 mt-1">Last 100 packets</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-center mb-2">
                    <ArrowDownIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-green-400">{trafficStats.inboundPackets}</div>
                  <div className="text-sm text-gray-300 font-medium">Inbound</div>
                  <div className="text-xs text-gray-500 mt-1">{((trafficStats.inboundPackets / Math.max(trafficStats.totalPackets, 1)) * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-center mb-2">
                    <ArrowUpIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-purple-400">{trafficStats.outboundPackets}</div>
                  <div className="text-sm text-gray-300 font-medium">Outbound</div>
                  <div className="text-xs text-gray-500 mt-1">{((trafficStats.outboundPackets / Math.max(trafficStats.totalPackets, 1)) * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-center mb-2">
                    <XMarkIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="text-3xl font-bold text-red-400">{trafficStats.blockedPackets}</div>
                  <div className="text-sm text-gray-300 font-medium">Blocked</div>
                  <div className="text-xs text-gray-500 mt-1">{((trafficStats.blockedPackets / Math.max(trafficStats.totalPackets, 1)) * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center justify-center mb-2">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">{trafficStats.flaggedPackets}</div>
                  <div className="text-sm text-gray-300 font-medium">Flagged</div>
                  <div className="text-xs text-gray-500 mt-1">{((trafficStats.flaggedPackets / Math.max(trafficStats.totalPackets, 1)) * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Traffic Filters */}
            <div className="p-6 border-b border-gray-600 bg-gray-800/20">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search Traffic</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by IP address, protocol, or application..."
                      value={trafficSearchTerm}
                      onChange={(e) => setTrafficSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Protocol</label>
                    <select
                      value={trafficFilter}
                      onChange={(e) => setTrafficFilter(e.target.value)}
                      className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    >
                      <option value="all">All Protocols</option>
                      <option value="TCP">TCP</option>
                      <option value="UDP">UDP</option>
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="DNS">DNS</option>
                      <option value="FTP">FTP</option>
                      <option value="SSH">SSH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={trafficStatusFilter}
                      onChange={(e) => setTrafficStatusFilter(e.target.value)}
                      className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    >
                      <option value="all">All Status</option>
                      <option value="allowed">Allowed</option>
                      <option value="blocked">Blocked</option>
                      <option value="flagged">Flagged</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Virtualized Traffic Logs */}
            <div className="bg-gray-900/30">
              <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600 z-10">
                <div className="flex items-center text-sm font-bold text-gray-200 uppercase tracking-wider">
                  <div className="w-32 flex-shrink-0 py-4 px-6">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      Time
                    </div>
                  </div>
                  <div className="w-40 flex-shrink-0 py-4 px-6">
                    <div className="flex items-center gap-2">
                      <ServerIcon className="h-4 w-4" />
                      Source
                    </div>
                  </div>
                  <div className="w-40 flex-shrink-0 py-4 px-6">
                    <div className="flex items-center gap-2">
                      <GlobeAltIcon className="h-4 w-4" />
                      Destination
                    </div>
                  </div>
                  <div className="w-20 flex-shrink-0 py-4 px-6">Protocol</div>
                  <div className="w-24 flex-shrink-0 py-4 px-6">Size</div>
                  <div className="w-24 flex-shrink-0 py-4 px-6">Direction</div>
                  <div className="w-24 flex-shrink-0 py-4 px-6">Status</div>
                  <div className="flex-1 py-4 px-6">Application</div>
                </div>
              </div>
              
              {filteredTrafficLogs.length > 0 ? (
                <List
                  height={400}
                  width="100%"
                  itemCount={filteredTrafficLogs.length}
                  itemSize={48}
                  itemData={filteredTrafficLogs}
                >
                  {TrafficLogRow}
                </List>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Traffic Data</h3>
                  <p className="text-gray-400 text-sm">
                    {trafficSearchTerm || trafficFilter !== 'all' || trafficStatusFilter !== 'all'
                      ? 'No traffic matches your filters'
                      : 'Waiting for network traffic...'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </ErrorBoundary>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
          <div className="p-6 bg-gray-800/20">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Search Network</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search devices, connections, or IP addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Device Type</label>
                  <select
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                    className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  >
                    <option value="all">All Types</option>
                    <option value="router">Routers</option>
                    <option value="switch">Switches</option>
                    <option value="firewall">Firewalls</option>
                    <option value="server">Servers</option>
                    <option value="endpoint">Endpoints</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Enhanced Devices Section with React Table */}
          <div className="xl:col-span-2">
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
                <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <ServerIcon className="h-6 w-6 text-blue-400" />
                      Network Devices ({filteredDevices.length})
                    </h2>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleScanNetwork}
                      disabled={isScanning}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 px-4 py-2"
                    >
                      {isScanning ? 'Scanning...' : 'Refresh'}
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-900/30">
                  {filteredDevices.length === 0 ? (
                    <EmptyState
                      title="No Devices Found"
                      description={searchTerm ? "No devices match your search criteria." : "Start a network scan to discover devices."}
                      action={
                        !searchTerm ? (
                          <Button
                            variant="primary"
                            onClick={handleScanNetwork}
                            disabled={isScanning}
                          >
                            {isScanning ? 'Scanning...' : 'Scan Network'}
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* React Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            {deviceTable.getHeaderGroups().map(headerGroup => (
                              <tr key={headerGroup.id} className="border-b border-gray-700">
                                {headerGroup.headers.map(header => (
                                  <th
                                    key={header.id}
                                    className="text-left py-3 px-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                                    onClick={header.column.getToggleSortingHandler()}
                                  >
                                    <div className="flex items-center gap-2">
                                      {flexRender(header.column.columnDef.header, header.getContext())}
                                      {header.column.getIsSorted() === 'asc' && (
                                        <ChevronUpIcon className="h-4 w-4" />
                                      )}
                                      {header.column.getIsSorted() === 'desc' && (
                                        <ChevronDownIcon className="h-4 w-4" />
                                      )}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            ))}
                          </thead>
                          <tbody>
                            {deviceTable.getRowModel().rows.map(row => (
                              <tr key={row.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                {row.getVisibleCells().map(cell => (
                                  <td key={cell.id} className="py-3 px-4 text-sm">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400">
                          Showing {deviceTable.getState().pagination.pageIndex * deviceTable.getState().pagination.pageSize + 1} to{' '}
                          {Math.min(
                            (deviceTable.getState().pagination.pageIndex + 1) * deviceTable.getState().pagination.pageSize,
                            filteredDevices.length
                          )}{' '}
                          of {filteredDevices.length} devices
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => deviceTable.previousPage()}
                            disabled={!deviceTable.getCanPreviousPage()}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-400">
                            Page {deviceTable.getState().pagination.pageIndex + 1} of {deviceTable.getPageCount()}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => deviceTable.nextPage()}
                            disabled={!deviceTable.getCanNextPage()}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </ErrorBoundary>
          </div>

          {/* Connections Panel */}
          <div>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
                <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <WifiIcon className="h-5 w-5 text-purple-400" />
                    Active Connections ({filteredConnections.length})
                  </h2>
                </div>
                <div className="p-6 bg-gray-900/30">
                  {filteredConnections.length === 0 ? (
                    <EmptyState
                      title="No Active Connections"
                      description="No network connections are currently active."
                    />
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredConnections.slice(0, 10).map((connection: NetworkConnection) => (
                        <div
                          key={connection.id}
                          className="p-4 bg-gray-800/30 rounded-lg border border-gray-600/50 hover:border-gray-500 hover:bg-gray-700/30 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge 
                              variant={connection.status === 'active' ? 'success' : 'error'}
                              className="text-xs"
                            >
                              {connection.status}
                            </Badge>
                            <span className="text-xs text-gray-400 font-mono">{connection.protocol}</span>
                          </div>
                          <div className="text-sm">
                            <div className="text-white truncate">{connection.sourceDevice}</div>
                            <div className="text-gray-400 text-xs">↓</div>
                            <div className="text-white truncate">{connection.targetDevice}</div>
                          </div>
                          {connection.metrics && (
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                              <div>Data: {formatBytes(connection.metrics.bytesTransferred)}</div>
                              <div>Latency: {formatLatency(connection.metrics.latency)}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </ErrorBoundary>
          </div>
        </div>

        {/* Device Details Modal */}
        {showDeviceDetails && selectedDevice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {React.createElement(
                      deviceTypeIcons[selectedDevice.type as keyof typeof deviceTypeIcons] || ServerIcon,
                      { className: "h-8 w-8 text-gray-400" }
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-white">{selectedDevice.name}</h2>
                      <p className="text-gray-400">{selectedDevice.ipAddress}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeviceDetails(false)}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Device Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <Badge variant={statusConfig[selectedDevice.status as keyof typeof statusConfig]?.variant || 'default'}>
                          {selectedDevice.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white capitalize">{selectedDevice.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">IP Address:</span>
                        <span className="text-white font-mono">{selectedDevice.ipAddress || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">MAC Address:</span>
                        <span className="text-white font-mono">{selectedDevice.macAddress || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Seen:</span>
                        <span className="text-white">{format(new Date(selectedDevice.lastSeen), 'PPpp')}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Performance Metrics</h3>
                    {selectedDevice.metrics ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Latency:</span>
                          <span className="text-white">{formatLatency(selectedDevice.metrics.latency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Packet Loss:</span>
                          <span className="text-white">{selectedDevice.metrics.packetLoss.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bandwidth:</span>
                          <span className="text-white">{selectedDevice.metrics.bandwidth.toFixed(1)} Mbps</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400">No performance metrics available</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Connection Action Confirmation */}
        <ConfirmDialog
          isOpen={selectedConnection !== null && actionType !== null}
          title={actionType === 'block' ? 'Block Connection' : 'Unblock Connection'}
          message={`Are you sure you want to ${actionType} this connection?`}
          confirmLabel={actionType === 'block' ? 'Block' : 'Unblock'}
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setSelectedConnection(null);
            setActionType(null);
          }}
          isLoading={isBlocking || isUnblocking}
        />
      </div>
    </ErrorBoundary>
  );
}; 