import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  ip?: string;
  user?: string;
}

interface VirtualLogListProps {
  logs: LogEntry[];
  height?: number;
  itemHeight?: number;
  onLogClick?: (log: LogEntry) => void;
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    case 'error':
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
    case 'info':
      return <InformationCircleIcon className="h-4 w-4 text-blue-400" />;
    default:
      return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
  }
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'border-l-red-500 bg-red-500/5';
    case 'error':
      return 'border-l-red-400 bg-red-400/5';
    case 'warning':
      return 'border-l-yellow-400 bg-yellow-400/5';
    case 'info':
      return 'border-l-blue-400 bg-blue-400/5';
    default:
      return 'border-l-green-400 bg-green-400/5';
  }
};

interface LogItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    logs: LogEntry[];
    onLogClick?: (log: LogEntry) => void;
  };
}

function LogItem({ index, style, data }: LogItemProps) {
  const log = data.logs[index];
  
  if (!log) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`border-l-4 hover:bg-gray-800/50 cursor-pointer ${getLevelColor(log.level)}`}
      onClick={() => data.onLogClick?.(log)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          {getLevelIcon(log.level)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span className="font-mono">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-gray-500">•</span>
            <span className="uppercase text-xs font-medium">
              {log.level}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">
              {log.source}
            </span>
            {log.ip && (
              <>
                <span className="text-gray-500">•</span>
                <span className="font-mono text-gray-400">
                  {log.ip}
                </span>
              </>
            )}
            {log.user && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">
                  {log.user}
                </span>
              </>
            )}
          </div>
          
          <div className="mt-1 text-sm text-white">
            {log.message}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VirtualLogList({ 
  logs, 
  height = 600, 
  itemHeight = 80, 
  onLogClick 
}: VirtualLogListProps) {
  const listRef = React.useRef<List>(null);

  // Auto-scroll to bottom when new logs are added
  React.useEffect(() => {
    if (listRef.current && logs.length > 0) {
      listRef.current.scrollToItem(logs.length - 1, 'end');
    }
  }, [logs.length]);

  const itemData = React.useMemo(() => ({
    logs,
    onLogClick,
  }), [logs, onLogClick]);

  if (logs.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border border-gray-700 rounded-lg bg-gray-900"
        style={{ height }}
      >
        <div className="text-center text-gray-400">
          <InformationCircleIcon className="h-12 w-12 mx-auto mb-2" />
          <p>No logs to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">
            Security Logs ({logs.length.toLocaleString()} entries)
          </h3>
          <div className="text-xs text-gray-400">
            Virtual scrolling enabled for performance
          </div>
        </div>
      </div>
      
      <List
        ref={listRef}
        height={height}
        itemCount={logs.length}
        itemSize={itemHeight}
        itemData={itemData}
        className="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600"
      >
        {LogItem}
      </List>
    </div>
  );
}

// Hook for managing virtual log data
export function useVirtualLogs() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState<string>('');

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const matchesText = !filter || 
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        log.source.toLowerCase().includes(filter.toLowerCase()) ||
        (log.ip && log.ip.includes(filter)) ||
        (log.user && log.user.toLowerCase().includes(filter.toLowerCase()));
      
      const matchesLevel = !levelFilter || log.level === levelFilter;
      
      return matchesText && matchesLevel;
    });
  }, [logs, filter, levelFilter]);

  const addLog = React.useCallback((log: LogEntry) => {
    setLogs(prev => [...prev, log]);
  }, []);

  const addLogs = React.useCallback((newLogs: LogEntry[]) => {
    setLogs(prev => [...prev, ...newLogs]);
  }, []);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  const generateSampleLogs = React.useCallback((count: number = 1000) => {
    setIsLoading(true);
    
    const sampleLogs: LogEntry[] = [];
    const levels: LogEntry['level'][] = ['info', 'warning', 'error', 'critical'];
    const sources = ['firewall', 'authentication', 'network', 'system', 'application'];
    const messages = [
      'Connection established from suspicious IP',
      'Failed login attempt detected',
      'Unusual network traffic pattern observed',
      'Security policy violation detected',
      'Malware signature detected in file',
      'Unauthorized access attempt blocked',
      'System resource usage anomaly',
      'Certificate validation failed',
      'Intrusion detection system alert',
      'Data exfiltration attempt prevented'
    ];
    
    for (let i = 0; i < count; i++) {
      sampleLogs.push({
        id: `log-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        ip: Math.random() > 0.5 ? `192.168.1.${Math.floor(Math.random() * 255)}` : undefined,
        user: Math.random() > 0.7 ? `user${Math.floor(Math.random() * 100)}` : undefined,
      });
    }
    
    // Sort by timestamp
    sampleLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    setTimeout(() => {
      setLogs(sampleLogs);
      setIsLoading(false);
    }, 500);
  }, []);

  return {
    logs: filteredLogs,
    isLoading,
    filter,
    setFilter,
    levelFilter,
    setLevelFilter,
    addLog,
    addLogs,
    clearLogs,
    generateSampleLogs,
    totalLogs: logs.length,
    filteredCount: filteredLogs.length,
  };
} 