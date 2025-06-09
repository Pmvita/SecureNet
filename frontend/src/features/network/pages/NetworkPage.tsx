import React, { useState, useMemo } from 'react';
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
} from '@heroicons/react/24/outline';

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

export const NetworkPage: React.FC = () => {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'block' | 'unblock' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
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

  // Filter devices based on search and filters
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           device.ipAddress.toLowerCase().includes(searchTerm.toLowerCase());
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
          <p className="text-gray-400 mt-1">Real-time network infrastructure overview</p>
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

      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search devices, connections, or IP addresses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="router">Routers</option>
                <option value="switch">Switches</option>
                <option value="firewall">Firewalls</option>
                <option value="server">Servers</option>
                <option value="endpoint">Endpoints</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Devices Section */}
        <div className="xl:col-span-2">
          <Card>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ServerIcon className="h-5 w-5" />
                  Network Devices ({filteredDevices.length})
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleScanNetwork}
                  disabled={isScanning}
                >
                  {isScanning ? 'Scanning...' : 'Refresh'}
                </Button>
              </div>
            </div>
            <div className="p-4">
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

        {/* Connections Sidebar */}
        <div>
          <Card>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <WifiIcon className="h-5 w-5" />
                Active Connections ({filteredConnections.length})
              </h2>
            </div>
            <div className="p-4">
              {filteredConnections.length === 0 ? (
                <EmptyState
                  title="No Connections"
                  description="No active network connections found."
                />
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredConnections.slice(0, 10).map((connection: NetworkConnection) => (
                    <div
                      key={connection.id}
                      className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
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
        onClose={() => {
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
        description={`Are you sure you want to ${actionType} this network connection?`}
        confirmText={actionType === 'block' ? 'Block' : 'Unblock'}
        isLoading={isBlocking || isUnblocking}
      />
    </div>
  );
}; 