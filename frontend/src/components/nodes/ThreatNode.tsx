import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  ExclamationTriangleIcon,
  FireIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

interface ThreatNodeData {
  label: string;
  device: Record<string, unknown>;
  status: 'online' | 'offline' | 'warning';
  threats: number;
  type: string;
  ipAddress: string;
  lastSeen?: string;
}

export function ThreatNode({ data, selected }: NodeProps<ThreatNodeData>) {
  const getThreatLevel = () => {
    if (data.threats >= 5) return 'critical';
    if (data.threats >= 3) return 'high';
    if (data.threats >= 1) return 'medium';
    return 'low';
  };

  const getThreatColor = () => {
    const level = getThreatLevel();
    switch (level) {
      case 'critical': return 'border-red-500 bg-red-500/20 shadow-red-500/20';
      case 'high': return 'border-orange-500 bg-orange-500/20 shadow-orange-500/20';
      case 'medium': return 'border-yellow-500 bg-yellow-500/20 shadow-yellow-500/20';
      default: return 'border-red-400 bg-red-400/20 shadow-red-400/20';
    }
  };

  const getThreatIcon = () => {
    const level = getThreatLevel();
    switch (level) {
      case 'critical': return FireIcon;
      case 'high': return ExclamationTriangleIcon;
      default: return ShieldExclamationIcon;
    }
  };

  const Icon = getThreatIcon();

  return (
    <div className={`
      relative bg-gray-900 border-2 rounded-lg p-3 min-w-[120px] shadow-xl
      ${getThreatColor()}
      ${selected ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-gray-950' : ''}
      hover:shadow-2xl transition-all duration-200 animate-pulse
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-600 border-2 border-red-400"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-red-400" />
        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      </div>
      
      <div className="text-white text-sm font-medium truncate mb-1">
        {data.label}
      </div>
      
      <div className="text-gray-300 text-xs truncate">
        {data.ipAddress}
      </div>
      
      <div className="text-red-400 text-xs font-medium mt-1">
        {data.threats} threat{data.threats !== 1 ? 's' : ''} detected
      </div>
      
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
        !
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-red-600 border-2 border-red-400"
      />
    </div>
  );
}

export default ThreatNode; 