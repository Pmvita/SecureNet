import React from 'react';
import { ComputerDesktopIcon, ServerIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

interface NetworkDevice {
  id: string;
  name: string;
  type: 'server' | 'workstation' | 'mobile' | 'router';
  ip: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen?: string;
}

interface NetworkDeviceCardProps {
  device: NetworkDevice;
  onClick?: (device: NetworkDevice) => void;
}

export const NetworkDeviceCard: React.FC<NetworkDeviceCardProps> = ({ device, onClick }) => {
  const getIcon = () => {
    switch (device.type) {
      case 'server': return <ServerIcon className="h-6 w-6" />;
      case 'mobile': return <DevicePhoneMobileIcon className="h-6 w-6" />;
      default: return <ComputerDesktopIcon className="h-6 w-6" />;
    }
  };

  const getStatusColor = () => {
    switch (device.status) {
      case 'online': return 'text-green-400';
      case 'offline': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div 
      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
      onClick={() => onClick?.(device)}
    >
      <div className="flex items-center space-x-3">
        <div className={getStatusColor()}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {device.name}
          </p>
          <p className="text-sm text-gray-400">
            {device.ip}
          </p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          device.status === 'online' ? 'bg-green-900 text-green-300' :
          device.status === 'offline' ? 'bg-red-900 text-red-300' :
          'bg-yellow-900 text-yellow-300'
        }`}>
          {device.status}
        </div>
      </div>
    </div>
  );
};

export default NetworkDeviceCard;