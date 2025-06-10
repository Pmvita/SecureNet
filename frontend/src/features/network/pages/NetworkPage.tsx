import React, { useState, useMemo, useEffect } from 'react';
import { useNetwork, type NetworkDevice, type NetworkConnection } from '../api/useNetwork';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow, format } from 'date-fns';
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
} from '@heroicons/react/24/outline';

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
      if (metrics?.traffic) {
        const realTrafficLogs = convertTrafficToLogs(metrics.traffic);
        setTrafficLogs(prev => {
          const newLogs = [...realTrafficLogs, ...prev];
          return newLogs.slice(0, 200); // Keep last 200 logs
        });
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
      {true && metrics && (
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

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-400">Bandwidth Usage</p>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.bandwidthUsage.toFixed(1)}</p>
                  <p className="text-xs text-orange-400">Mbps</p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-400">Packet Loss</p>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.packetLoss.toFixed(2)}%</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-400">Avg Latency</p>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.averageLatency.toFixed(1)}</p>
                  <p className="text-xs text-cyan-400">ms</p>
                </div>
                <SignalIcon className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Live Traffic Monitoring Section */}
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
        {/* Enhanced Header with Live Indicator */}
        <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`relative w-4 h-4 rounded-full ${isTrafficMonitoring ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {isTrafficMonitoring && (
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping"></div>
                  )}
                  <div className={`absolute inset-0 rounded-full ${isTrafficMonitoring ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                </div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BoltIcon className="h-6 w-6 text-yellow-400" />
                  Live Network Traffic
                </h2>
                {isTrafficMonitoring && (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-sm font-semibold px-3 py-1 bg-green-500/20 text-green-400 border-green-500/30">
                      ● LIVE
                    </Badge>
                    <span className="text-sm text-gray-400">Real-time monitoring active</span>
                  </div>
                )}
                {!isTrafficMonitoring && (
                  <Badge variant="default" className="text-sm px-3 py-1 bg-gray-500/20 text-gray-400 border-gray-500/30">
                    ⏸ PAUSED
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">
                {filteredTrafficLogs.length} packets shown
              </div>
              <Button
                variant={isTrafficMonitoring ? "secondary" : "primary"}
                size="sm"
                onClick={toggleTrafficMonitoring}
                className={`flex items-center gap-2 px-4 py-2 font-semibold ${
                  isTrafficMonitoring 
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30' 
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30'
                }`}
              >
                {isTrafficMonitoring ? (
                  <>
                    <PauseIcon className="h-4 w-4" />
                    Pause Monitor
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    Resume Monitor
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Traffic Statistics */}
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

        {/* Enhanced Traffic Filters */}
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
                  <option value="HTTP">HTTP</option>
                  <option value="HTTPS">HTTPS</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="FTP">FTP</option>
                  <option value="SSH">SSH</option>
                  <option value="DNS">DNS</option>
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

        {/* Enhanced Traffic Logs Table */}
        <div className="overflow-x-auto bg-gray-900/30">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    Time
                  </div>
                </th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ServerIcon className="h-4 w-4" />
                    Source
                  </div>
                </th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="h-4 w-4" />
                    Destination
                  </div>
                </th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">Protocol</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">Size</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">Direction</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-200 uppercase tracking-wider">Application</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredTrafficLogs.slice(0, 20).map((log, index) => {
                const protocolInfo = protocolConfig[log.protocol as keyof typeof protocolConfig] || 
                  { color: 'text-gray-400', bgColor: 'bg-gray-400/10' };
                const statusInfo = trafficStatusConfig[log.status];
                const isRecent = index < 3; // Highlight recent entries

                return (
                  <tr 
                    key={log.id} 
                    className={`border-b border-gray-800/50 hover:bg-gray-700/30 transition-all duration-200 ${
                      isRecent ? 'bg-blue-500/5 border-blue-500/20' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className={`text-sm font-mono ${isRecent ? 'text-blue-300' : 'text-gray-300'}`}>
                        {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-sm font-mono text-white font-semibold">{log.sourceIp}</div>
                        <div className="text-xs text-gray-400">Port: {log.sourcePort}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-mono text-white font-semibold">{log.destinationIp}</div>
                          <div className="text-xs text-gray-400">Port: {log.destinationPort}</div>
                        </div>
                        {log.country && (
                          <Badge variant="default" className="text-xs px-2 py-1 bg-gray-600/30 text-gray-300 border-gray-600">
                            {log.country}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge 
                        variant="default" 
                        className={`text-sm px-3 py-1 font-semibold ${protocolInfo.color} ${protocolInfo.bgColor} border-current/30`}
                      >
                        {log.protocol}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-300 font-medium">
                        {formatBytes(log.packetSize)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${log.direction === 'inbound' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                          {log.direction === 'inbound' ? (
                            <ArrowDownIcon className="h-4 w-4 text-green-400" />
                          ) : (
                            <ArrowUpIcon className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                        <span className={`text-sm font-semibold capitalize ${log.direction === 'inbound' ? 'text-green-400' : 'text-blue-400'}`}>
                          {log.direction}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${statusInfo.color.replace('text-', 'bg-').replace('-400', '-500/20')}`}>
                          <statusInfo.icon className={`h-4 w-4 ${statusInfo.color}`} />
                        </div>
                        <Badge variant={statusInfo.variant} className="text-sm px-3 py-1 font-semibold">
                          {log.status.toUpperCase()}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-300">
                        {log.application ? (
                          <span className="px-2 py-1 bg-gray-600/30 rounded text-xs font-medium">
                            {log.application}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTrafficLogs.length === 0 && (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Traffic Data</h3>
            <p className="text-gray-400 text-sm">
              {trafficSearchTerm || trafficFilter !== 'all' || trafficStatusFilter !== 'all' 
                ? 'No traffic matches your current filters' 
                : 'Waiting for network traffic...'}
            </p>
          </div>
        )}

        {filteredTrafficLogs.length > 50 && (
          <div className="p-4 text-center border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Showing latest 50 of {filteredTrafficLogs.length} traffic logs
            </p>
          </div>
        )}
      </Card>

      {/* Enhanced Search and Filters */}
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
        {/* Enhanced Devices Section */}
        <div className="xl:col-span-2">
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
                <div className="space-y-3">
                  {filteredDevices.map((device: NetworkDevice) => {
                    const statusInfo = statusConfig[device.status as keyof typeof statusConfig];
                    const DeviceIcon = deviceTypeIcons[device.type as keyof typeof deviceTypeIcons] || ServerIcon;
                    const StatusIcon = statusInfo?.icon || CheckCircleIcon;

                    return (
                      <div
                        key={device.id}
                        className={`p-4 rounded-lg border transition-all hover:border-gray-600 cursor-pointer ${statusInfo?.bgColor || 'bg-gray-800/50 border-gray-700'}`}
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowDeviceDetails(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <DeviceIcon className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-white truncate">{device.name}</h3>
                                <Badge variant={statusInfo?.variant || 'default'} className="flex items-center gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {device.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-sm text-gray-400">{device.ipAddress || 'No IP'}</p>
                                <p className="text-sm text-gray-500">•</p>
                                <p className="text-sm text-gray-400 capitalize">{device.type}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <ClockIcon className="h-4 w-4" />
                              {formatDistanceToNow(new Date(device.lastSeen))} ago
                            </div>
                            {device.metrics && (
                              <div className="text-xs text-gray-500 mt-1">
                                Latency: {formatLatency(device.metrics.latency)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Enhanced Connections Sidebar */}
        <div>
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <WifiIcon className="h-6 w-6 text-purple-400" />
                Active Connections ({filteredConnections.length})
              </h2>
            </div>
            <div className="p-6 bg-gray-900/30">
              {filteredConnections.length === 0 ? (
                <EmptyState
                  title="No Connections"
                  description="No active network connections found."
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
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(connection.id);
                            setActionType(connection.status === 'active' ? 'block' : 'unblock');
                          }}
                          className="text-xs"
                        >
                          {connection.status === 'active' ? 'Block' : 'Unblock'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          <EyeIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredConnections.length > 10 && (
                    <div className="text-center text-sm text-gray-400 py-2">
                      +{filteredConnections.length - 10} more connections
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
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
        isOpen={!!selectedConnection && !!actionType}
        onCancel={() => {
          setSelectedConnection(null);
          setActionType(null);
        }}
        onConfirm={() => {
          if (selectedConnection && actionType === 'block') {
            handleBlockConnection(selectedConnection);
          } else if (selectedConnection && actionType === 'unblock') {
            handleUnblockConnection(selectedConnection);
          }
        }}
        title={`${actionType === 'block' ? 'Block' : 'Unblock'} Connection`}
        message={`Are you sure you want to ${actionType} this network connection?`}
        confirmLabel={actionType === 'block' ? 'Block' : 'Unblock'}
        isLoading={isBlocking || isUnblocking}
      />
    </div>
  );
}; 