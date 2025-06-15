import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface SecurityNodeData {
  label: string;
  device: Record<string, unknown>;
  status: 'online' | 'offline' | 'warning';
  threats: number;
  type: string;
  ipAddress: string;
  lastSeen?: string;
}

export function SecurityNode({ data, selected }: NodeProps<SecurityNodeData>) {
  const getSecurityIcon = () => {
    const type = data.type?.toLowerCase() || '';
    if (type.includes('firewall')) {
      return LockClosedIcon;
    }
    if (type.includes('monitor') || type.includes('ids') || type.includes('ips')) {
      return EyeIcon;
    }
    return ShieldCheckIcon;
  };

  const Icon = getSecurityIcon();

  const getStatusColor = () => {
    if (data.threats > 0) {
      return 'border-red-400 bg-red-400/10';
    }
    switch (data.status) {
      case 'online': return 'border-purple-400 bg-purple-400/10';
      case 'offline': return 'border-gray-500 bg-gray-500/10';
      case 'warning': return 'border-yellow-400 bg-yellow-400/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusDot = () => {
    if (data.threats > 0) {
      return 'bg-red-400 animate-pulse';
    }
    switch (data.status) {
      case 'online': return 'bg-purple-400';
      case 'offline': return 'bg-gray-500';
      case 'warning': return 'bg-yellow-400';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`
      relative bg-gray-800 border-2 rounded-lg p-3 min-w-[140px] shadow-lg
      ${getStatusColor()}
      ${selected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-950' : ''}
      hover:shadow-xl transition-all duration-200
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-6 w-6 text-purple-400" />
        <div className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
      </div>
      
      <div className="text-white text-sm font-medium truncate mb-1">
        {data.label}
      </div>
      
      <div className="text-gray-400 text-xs truncate mb-1">
        {data.ipAddress}
      </div>
      
      <div className="text-purple-400 text-xs font-medium">
        Security • {data.status}
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

export default SecurityNode; 