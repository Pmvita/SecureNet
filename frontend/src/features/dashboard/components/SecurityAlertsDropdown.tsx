import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  BellIcon,
  FireIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  BugAntIcon,
  ServerIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  FunnelIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';

// Alert types that will be displayed in the dropdown
export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'threat' | 'vulnerability' | 'anomaly' | 'compliance' | 'network' | 'system';
  timestamp: string;
  read: boolean;
  source?: string;
  affectedAssets?: string[];
}

export interface SecurityAlertsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SecurityAlert[];
  onAlertClick?: (alert: SecurityAlert) => void;
  onMarkAsRead?: (alertId: string) => void;
  onMarkAllAsRead?: () => void;
  className?: string;
}

const severityConfig = {
  critical: { 
    color: 'text-red-400', 
    bgColor: 'bg-red-400/10', 
    badge: 'error' as const,
    icon: FireIcon 
  },
  high: { 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-400/10', 
    badge: 'error' as const,
    icon: ExclamationTriangleIcon 
  },
  medium: { 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-400/10', 
    badge: 'warning' as const,
    icon: ExclamationTriangleIcon 
  },
  low: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-400/10', 
    badge: 'info' as const,
    icon: ExclamationTriangleIcon 
  },
};

const categoryConfig = {
  threat: { icon: FireIcon, label: 'Threat', color: 'text-red-400' },
  vulnerability: { icon: ShieldExclamationIcon, label: 'Vulnerability', color: 'text-orange-400' },
  anomaly: { icon: BugAntIcon, label: 'Anomaly', color: 'text-purple-400' },
  compliance: { icon: CheckCircleIcon, label: 'Compliance', color: 'text-blue-400' },
  network: { icon: ServerIcon, label: 'Network', color: 'text-cyan-400' },
  system: { icon: DocumentTextIcon, label: 'System', color: 'text-green-400' },
};

export function SecurityAlertsDropdown({
  isOpen,
  onClose,
  alerts,
  onAlertClick,
  onMarkAsRead,
  onMarkAllAsRead,
  className = '',
}: SecurityAlertsDropdownProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Filter alerts based on selected filters
  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const categoryMatch = filterCategory === 'all' || alert.category === filterCategory;
    return severityMatch && categoryMatch;
  });

  const unreadCount = alerts.filter(alert => !alert.read).length;
  const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;

  const handleAlertClick = (alert: SecurityAlert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    }
    if (onMarkAsRead && !alert.read) {
      onMarkAsRead(alert.id);
    }
  };

  const handleViewAllAlerts = () => {
    onClose();
    navigate('/security');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute right-0 top-full mt-2 w-96 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-50 ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-red-500/10 to-orange-500/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Security Alerts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <span className="text-red-400 font-medium">
                {unreadCount} unread
              </span>
            )}
            {criticalCount > 0 && (
              <span className="text-orange-400 font-medium">
                {criticalCount} critical
              </span>
            )}
          </div>
          {unreadCount > 0 && onMarkAllAsRead && (
            <button
              onClick={onMarkAllAsRead}
              className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <FunnelIcon className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400">Filter:</span>
          </div>
          
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="threat">Threats</option>
            <option value="vulnerability">Vulnerabilities</option>
            <option value="anomaly">Anomalies</option>
            <option value="compliance">Compliance</option>
            <option value="network">Network</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-2">No Security Alerts</h4>
            <p className="text-gray-400 text-sm">
              {alerts.length === 0 
                ? "All systems are secure. No active threats detected." 
                : "No alerts match your current filters."
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const severityInfo = severityConfig[alert.severity];
            const categoryInfo = categoryConfig[alert.category];
            const SeverityIcon = severityInfo.icon;
            const CategoryIcon = categoryInfo.icon;

            return (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`p-4 border-b border-gray-700 last:border-b-0 cursor-pointer transition-all hover:bg-gray-750 ${
                  !alert.read ? `${severityInfo.bgColor} border-l-4 border-l-${alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'orange' : alert.severity === 'medium' ? 'yellow' : 'blue'}-500` : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Severity Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <SeverityIcon className={`h-4 w-4 ${severityInfo.color}`} />
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-medium ${!alert.read ? 'text-white' : 'text-gray-300'}`}>
                        {alert.title}
                      </h4>
                      {!alert.read && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </div>

                    <p className={`text-xs ${!alert.read ? 'text-gray-300' : 'text-gray-400'} mb-2 line-clamp-2`}>
                      {alert.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityInfo.badge} className="text-xs px-1.5 py-0.5">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <CategoryIcon className={`h-3 w-3 ${categoryInfo.color}`} />
                          <span className="text-xs text-gray-400 capitalize">
                            {alert.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(alert.timestamp))} ago
                        </span>
                        <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                      </div>
                    </div>

                    {alert.affectedAssets && alert.affectedAssets.length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        Affected: {alert.affectedAssets.slice(0, 2).join(', ')}
                        {alert.affectedAssets.length > 2 && ` +${alert.affectedAssets.length - 2} more`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 bg-gray-800/50">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleViewAllAlerts}
          className="w-full text-sm flex items-center justify-center gap-2"
        >
          <EyeIcon className="h-4 w-4" />
          View All Security Alerts
        </Button>
      </div>
    </div>
  );
} 