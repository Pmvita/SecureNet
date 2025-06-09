import React, { useState } from 'react';
import { useNetwork, type NetworkDevice, type NetworkConnection } from '../api/useNetwork';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';

export const NetworkPage: React.FC = () => {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'block' | 'unblock' | null>(null);
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

  const handleBlockConnection = async (connectionId: string) => {
    try {
      await blockConnection(connectionId);
      setSelectedConnection(null);
      setActionType(null);
      toast({
        title: 'Connection blocked successfully',
        description: '',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to block connection',
        description: '',
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
        description: '',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to unblock connection',
        description: '',
        variant: 'error',
      });
    }
  };

  const handleScanNetwork = async () => {
    try {
      await scanNetwork();
      toast({
        title: 'Network scan started successfully',
        description: '',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to start network scan',
        description: '',
        variant: 'error',
      });
    }
  };

  const getDeviceStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConnectionStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'blocked':
        return 'error';
      case 'monitored':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isError) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'An unexpected error occurred while loading network data';

    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Network Data</h2>
            <p className="text-gray-400 mb-4">{errorMessage}</p>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Network</h1>
        <Button
          variant="primary"
          onClick={handleScanNetwork}
          disabled={isScanning}
        >
          {isScanning ? 'Scanning...' : 'Scan Network'}
        </Button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Devices</h3>
              <p className="mt-2 text-3xl font-semibold">{metrics.totalDevices}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Active Connections</h3>
              <p className="mt-2 text-3xl font-semibold">{metrics.activeConnections}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Bandwidth Usage</h3>
              <p className="mt-2 text-3xl font-semibold">{metrics.bandwidthUsage} Mbps</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Packet Loss</h3>
              <p className="mt-2 text-3xl font-semibold">{metrics.packetLoss}%</p>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Devices</h2>
            {devices.length === 0 ? (
              <EmptyState
                title="No Devices Found"
                description="Start a network scan to discover devices."
                action={
                  <Button
                    variant="primary"
                    onClick={handleScanNetwork}
                    disabled={isScanning}
                  >
                    {isScanning ? 'Scanning...' : 'Scan Network'}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {devices.map((device: NetworkDevice) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Badge variant={getDeviceStatusVariant(device.status)}>
                        {device.status}
                      </Badge>
                      <div>
                        <h3 className="font-medium">{device.name}</h3>
                        <p className="text-sm text-gray-400">{device.ipAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{device.type}</p>
                      <p className="text-xs text-gray-500">
                        Last seen: {formatDistanceToNow(new Date(device.lastSeen))} ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Connections</h2>
            {connections.length === 0 ? (
              <EmptyState
                title="No Connections Found"
                description="Start a network scan to discover connections."
                action={
                  <Button
                    variant="primary"
                    onClick={handleScanNetwork}
                    disabled={isScanning}
                  >
                    {isScanning ? 'Scanning...' : 'Scan Network'}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {connections.map((connection: NetworkConnection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Badge variant={getConnectionStatusVariant(connection.status)}>
                        {connection.status}
                      </Badge>
                      <div>
                        <h3 className="font-medium">
                          {connection.sourceDevice} → {connection.targetDevice}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {connection.protocol}:{connection.port}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {connection.status === 'active' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(connection.id);
                            setActionType('block');
                          }}
                          disabled={isBlocking}
                        >
                          Block
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(connection.id);
                            setActionType('unblock');
                          }}
                          disabled={isUnblocking}
                        >
                          Unblock
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={!!selectedConnection && !!actionType}
        onCancel={() => {
          setSelectedConnection(null);
          setActionType(null);
        }}
        onConfirm={() => {
          if (!selectedConnection || !actionType) return;
          if (actionType === 'block') {
            handleBlockConnection(selectedConnection);
          } else {
            handleUnblockConnection(selectedConnection);
          }
        }}
        title={actionType === 'block' ? 'Block Connection' : 'Unblock Connection'}
        message={`Are you sure you want to ${actionType} this connection?`}
        confirmLabel={actionType === 'block' ? 'Block' : 'Unblock'}
        cancelLabel="Cancel"
        variant={actionType === 'block' ? 'danger' : 'default'}
        isLoading={actionType === 'block' ? isBlocking : isUnblocking}
      />
    </div>
  );
}; 