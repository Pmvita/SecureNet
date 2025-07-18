import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  ComputerDesktopIcon, 
  WifiIcon, 
  DevicePhoneMobileIcon,
  PrinterIcon 
} from '@heroicons/react/24/outline';

interface DeviceNodeData {
  label: string;
  device: Record<string, unknown>;
  status: 'online' | 'offline' | 'warning';
  threats: number;
  type: string;
  ipAddress: string;
  lastSeen?: string;
}

export function DeviceNode({ data, selected }: NodeProps<DeviceNodeData>) {
  const getDeviceIcon = () => {
    const type = data.type?.toLowerCase() || '';
    if (type.includes('mobile') || type.includes('phone')) {
      return DevicePhoneMobileIcon;
    }
    if (type.includes('printer')) {
      return PrinterIcon;
    }
    if (type.includes('router') || type.includes('wifi')) {
      return WifiIcon;
    }
    return ComputerDesktopIcon;
  };

  const Icon = getDeviceIcon();

  const getStatusColor = () => {
    switch (data.status) {
      case 'online': return 'border-green-400 bg-green-400/10';
      case 'offline': return 'border-gray-500 bg-gray-500/10';
      case 'warning': return 'border-yellow-400 bg-yellow-400/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusDot = () => {
    switch (data.status) {
      case 'online': return 'bg-green-400';
      case 'offline': return 'bg-gray-500';
      case 'warning': return 'bg-yellow-400';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`
      relative bg-gray-800 border-2 rounded-lg p-3 min-w-[120px] shadow-lg
      ${getStatusColor()}
      ${selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-950' : ''}
      hover:shadow-xl transition-all duration-200
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-blue-400" />
        <div className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
      </div>
      
      <div className="text-white text-sm font-medium truncate mb-1">
        {data.label}
      </div>
      
      <div className="text-gray-400 text-xs truncate">
        {data.ipAddress}
      </div>
      
      {data.threats > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {data.threats}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400"
      />
    </div>
  );
}

export default DeviceNode; 