import React from 'react';
import { ShieldCheckIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface SecurityScan {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastRun?: string;
  findings?: number;
}

interface SecurityScanCardProps {
  scan: SecurityScan;
  onStart?: (scan: SecurityScan) => void;
  onView?: (scan: SecurityScan) => void;
}

export const SecurityScanCard: React.FC<SecurityScanCardProps> = ({ scan, onStart, onView }) => {
  const getIcon = () => {
    switch (scan.status) {
      case 'completed': return <ShieldCheckIcon className="h-6 w-6 text-green-400" />;
      case 'running': return <ClockIcon className="h-6 w-6 text-blue-400" />;
      case 'failed': return <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />;
      default: return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getSeverityColor = () => {
    switch (scan.severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div>
            <h3 className="text-sm font-medium text-white">{scan.name}</h3>
            <p className="text-xs text-gray-400">
              {scan.lastRun ? `Last run: ${scan.lastRun}` : 'Never run'}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          scan.status === 'completed' ? 'bg-green-900 text-green-300' :
          scan.status === 'running' ? 'bg-blue-900 text-blue-300' :
          scan.status === 'failed' ? 'bg-red-900 text-red-300' :
          'bg-gray-900 text-gray-300'
        }`}>
          {scan.status}
        </div>
      </div>
      
      {scan.findings !== undefined && (
        <div className="mb-3">
          <p className="text-sm text-gray-300">
            Findings: <span className={getSeverityColor()}>{scan.findings}</span>
          </p>
        </div>
      )}
      
      <div className="flex space-x-2">
        {scan.status !== 'running' && (
          <button
            onClick={() => onStart?.(scan)}
            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
          >
            Start Scan
          </button>
        )}
        {scan.status === 'completed' && (
          <button
            onClick={() => onView?.(scan)}
            className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors"
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );
};

export default SecurityScanCard;