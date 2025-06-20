import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card } from '../common/Card/Card';
import { Badge } from '../common/Badge/Badge';
import { Button } from '../common/Button/Button';
import { Input } from '../common/Input/Input';
import { Select } from '../common/Select/Select';

interface SecurityLog {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_type: string;
  source_ip: string;
  username?: string;
  description: string;
  details?: Record<string, unknown>;
}

interface VirtualSecurityLogsTableProps {
  logs: SecurityLog[];
  onLogSelect?: (log: SecurityLog) => void;
  className?: string;
  height?: number;
}

const ITEM_HEIGHT = 80;
const HEADER_HEIGHT = 60;

const SecurityLogRow: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    logs: SecurityLog[];
    onLogSelect?: (log: SecurityLog) => void;
  };
}> = ({ index, style, data }) => {
  const log = data.logs[index];
  const { onLogSelect } = data;

  const getSeverityColor = (severity: string): 'default' | 'destructive' | 'warning' => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div 
      style={style} 
      className="flex items-center px-4 py-2 border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
        {/* Timestamp */}
        <div className="col-span-2 text-sm text-gray-600 font-mono">
          {formatTimestamp(log.timestamp)}
        </div>
        
        {/* Severity */}
        <div className="col-span-1">
          <Badge variant={getSeverityColor(log.severity)}>
            {log.severity.toUpperCase()}
          </Badge>
        </div>
        
        {/* Event Type */}
        <div className="col-span-2 text-sm font-medium text-gray-900 truncate">
          {log.event_type}
        </div>
        
        {/* Source IP */}
        <div className="col-span-2 text-sm text-gray-600 font-mono">
          {log.source_ip}
        </div>
        
        {/* Username */}
        <div className="col-span-1 text-sm text-gray-600 truncate">
          {log.username || '-'}
        </div>
        
        {/* Description */}
        <div className="col-span-3 text-sm text-gray-900 truncate">
          {log.description}
        </div>
        
        {/* Actions */}
        <div className="col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLogSelect?.(log)}
            className="text-xs"
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

const TableHeader: React.FC = () => (
  <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
    <div className="flex-1 grid grid-cols-12 gap-4">
      <div className="col-span-2">Timestamp</div>
      <div className="col-span-1">Severity</div>
      <div className="col-span-2">Event Type</div>
      <div className="col-span-2">Source IP</div>
      <div className="col-span-1">User</div>
      <div className="col-span-3">Description</div>
      <div className="col-span-1 text-right">Actions</div>
    </div>
  </div>
);

export const VirtualSecurityLogsTable: React.FC<VirtualSecurityLogsTableProps> = ({
  logs,
  onLogSelect,
  className = '',
  height = 600
}) => {
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>(logs);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Filter logs based on search and filter criteria
  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source_ip.includes(searchTerm) ||
        log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.event_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(log => log.severity === severityFilter);
    }

    // Apply event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.event_type === eventTypeFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, severityFilter, eventTypeFilter]);

  // Get unique event types for filter dropdown
  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(logs.map(log => log.event_type)));
    return types.sort();
  }, [logs]);

  const itemData = useMemo(() => ({
    logs: filteredLogs,
    onLogSelect
  }), [filteredLogs, onLogSelect]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSeverityFilter('all');
    setEventTypeFilter('all');
  }, []);

  const totalHeight = height;
  const listHeight = totalHeight - HEADER_HEIGHT - 120; // Account for filters and header

  return (
    <Card className={`${className} overflow-hidden`}>
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Search logs by description, IP, user, or event type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="min-w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="min-w-40 px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Event Types</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            disabled={searchTerm === '' && severityFilter === 'all' && eventTypeFilter === 'all'}
          >
            Clear Filters
          </Button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredLogs.length.toLocaleString()} of {logs.length.toLocaleString()} logs
        </div>
      </div>

      {/* Table Header */}
      <TableHeader />

      {/* Virtual List */}
      <div style={{ height: listHeight }}>
        {filteredLogs.length > 0 ? (
          <List
            height={listHeight}
            width="100%"
            itemCount={filteredLogs.length}
            itemSize={ITEM_HEIGHT}
            itemData={itemData}
            overscanCount={10}
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {SecurityLogRow}
          </List>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">No logs found</p>
              <p className="text-sm mt-1">
                {logs.length === 0 ? 'No security logs available' : 'Try adjusting your filters'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Performance Info */}
      {filteredLogs.length > 1000 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-xs text-blue-700">
          ⚡ Virtual scrolling enabled - Rendering {Math.min(20, filteredLogs.length)} of {filteredLogs.length.toLocaleString()} rows for optimal performance
        </div>
      )}
    </Card>
  );
};

export default VirtualSecurityLogsTable; 