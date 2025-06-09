import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network as VisNetwork } from 'vis-network';
import { GlobeAltIcon, ServerIcon, ComputerDesktopIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

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

interface NetworkStats {
  totalDevices: number;
  onlineDevices: number;
  activeConnections: number;
  bandwidthUsage: {
    incoming: number;
    outgoing: number;
  };
}

async function fetchNetworkDevices(): Promise<NetworkDevice[]> {
  const response = await fetch('/api/network/devices');
  if (!response.ok) throw new Error('Failed to fetch network devices');
  return response.json();
}

async function fetchNetworkStats(): Promise<NetworkStats> {
  const response = await fetch('/api/network/stats');
  if (!response.ok) throw new Error('Failed to fetch network stats');
  return response.json();
}

const deviceTypes = {
  server: { icon: ServerIcon, color: '#10B981' },
  workstation: { icon: ComputerDesktopIcon, color: '#3B82F6' },
  mobile: { icon: DevicePhoneMobileIcon, color: '#8B5CF6' },
  router: { icon: GlobeAltIcon, color: '#F59E0B' },
  switch: { icon: GlobeAltIcon, color: '#EF4444' },
};

export default function Network() {
  const networkRef = useRef<HTMLDivElement>(null);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [network, setNetwork] = useState<VisNetwork | null>(null);

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['networkDevices'],
    queryFn: fetchNetworkDevices,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['networkStats'],
    queryFn: fetchNetworkStats,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Initialize network visualization
  useEffect(() => {
    if (!networkRef.current || !devices) return;

    const nodes = devices.map(device => ({
      id: device.id,
      label: device.name,
      title: `${device.name}\n${device.ip}\n${device.type}`,
      color: {
        background: deviceTypes[device.type].color,
        border: device.status === 'online' ? '#10B981' : device.status === 'warning' ? '#F59E0B' : '#EF4444',
        highlight: {
          background: deviceTypes[device.type].color,
          border: '#3B82F6',
        },
      },
      shape: 'dot',
      size: 20,
    }));

    const edges = devices.flatMap(device =>
      device.connections.map(targetId => ({
        from: device.id,
        to: targetId,
        arrows: 'to',
        smooth: {
          enabled: true,
          type: 'curvedCW',
          roundness: 0.2,
        },
      }))
    );

    const data = { nodes, edges };
    const options = {
      nodes: {
        font: {
          color: '#fff',
          size: 14,
        },
      },
      edges: {
        color: {
          color: 'rgba(255, 255, 255, 0.2)',
          highlight: '#3B82F6',
        },
        width: 2,
      },
      physics: {
        stabilization: {
          iterations: 100,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          springLength: 200,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
      },
    };

    const visNetwork = new VisNetwork(networkRef.current, data, options);

    visNetwork.on('click', (params) => {
      if (params.nodes.length > 0) {
        const deviceId = params.nodes[0];
        const device = devices.find(d => d.id === deviceId);
        setSelectedDevice(device || null);
      } else {
        setSelectedDevice(null);
      }
    });

    setNetwork(visNetwork);

    return () => {
      visNetwork.destroy();
    };
  }, [devices]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Network Overview</h1>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Devices</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.totalDevices ?? 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-500/10">
              <GlobeAltIcon className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Online Devices</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.onlineDevices ?? 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <ServerIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Connections</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.activeConnections ?? 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <ComputerDesktopIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Bandwidth Usage</p>
              <p className="mt-2 text-sm text-gray-300">
                In: {statsLoading ? '-' : `${(stats?.bandwidthUsage.incoming ?? 0).toFixed(2)} MB/s`}
              </p>
              <p className="text-sm text-gray-300">
                Out: {statsLoading ? '-' : `${(stats?.bandwidthUsage.outgoing ?? 0).toFixed(2)} MB/s`}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10">
              <DevicePhoneMobileIcon className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Network Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="glass-card p-4">
            <div ref={networkRef} className="h-[600px] w-full" />
          </div>
        </div>

        {/* Device Details */}
        <div className="glass-card p-6">
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

              {selectedDevice.metadata.os && (
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

              {selectedDevice.metadata.services && selectedDevice.metadata.services.length > 0 && (
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
                <div className="mt-2 space-y-2">
                  {selectedDevice.connections.map((deviceId) => {
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
            <p className="text-gray-400">Select a device to view details</p>
          )}
        </div>
      </div>
    </div>
  );
} 