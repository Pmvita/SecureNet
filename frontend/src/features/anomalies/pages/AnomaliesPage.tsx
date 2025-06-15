import React, { useState, useMemo } from 'react';
import { useAnomalies, type Anomaly, type AnomalyMetrics } from '../api/useAnomalies';
// Phase 1 imports
import { ErrorBoundary } from 'react-error-boundary';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { FixedSizeList as List } from 'react-window';

// Extended Anomaly interface with optional properties
interface ExtendedAnomaly extends Anomaly {
  confidence?: number;
  metadata?: Record<string, unknown>;
  impact_score?: string | number;
}
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  BugAntIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PlayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ServerIcon,
  CpuChipIcon,
  GlobeAltIcon,
  DocumentChartBarIcon,
  ClockIcon,
  FireIcon,
  LightBulbIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  BeakerIcon,
  CubeIcon,
  WifiIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { SimpleSecurityGrid } from '@/components/grids/SimpleSecurityGrid';

// Anomaly configurations
const severityConfig = {
  critical: { 
    variant: 'error' as const, 
    icon: FireIcon, 
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'Critical'
  },
  high: { 
    variant: 'error' as const, 
    icon: ExclamationTriangleIcon, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    label: 'High'
  },
  medium: { 
    variant: 'warning' as const, 
    icon: ExclamationTriangleIcon, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Medium'
  },
  low: { 
    variant: 'info' as const, 
    icon: InformationCircleIcon, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Low'
  },
};

const statusConfig = {
  active: { 
    variant: 'error' as const, 
    icon: ExclamationCircleIcon, 
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'Active'
  },
  investigating: { 
    variant: 'warning' as const, 
    icon: MagnifyingGlassIcon, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Investigating'
  },
  resolved: { 
    variant: 'success' as const, 
    icon: CheckCircleIcon, 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    label: 'Resolved'
  },
  false_positive: { 
    variant: 'info' as const, 
    icon: XCircleIcon, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'False Positive'
  },
};

const typeConfig = {
  'network': { icon: GlobeAltIcon, color: 'text-blue-400', label: 'Network Anomaly' },
  'system': { icon: ServerIcon, color: 'text-green-400', label: 'System Anomaly' },
  'security': { icon: ShieldExclamationIcon, color: 'text-red-400', label: 'Security Anomaly' },
  'performance': { icon: CpuChipIcon, color: 'text-purple-400', label: 'Performance Anomaly' },
  'behavioral': { icon: UserIcon, color: 'text-cyan-400', label: 'Behavioral Anomaly' },
  'data': { icon: DocumentTextIcon, color: 'text-orange-400', label: 'Data Anomaly' },
};

interface AnomalyDetailsModalProps {
  anomaly: ExtendedAnomaly | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (id: string) => void;
  onMarkAsFalsePositive: (id: string) => void;
}

const AnomalyDetailsModal: React.FC<AnomalyDetailsModalProps> = ({ 
  anomaly, 
  isOpen, 
  onClose, 
  onResolve, 
  onMarkAsFalsePositive 
}) => {
  if (!isOpen || !anomaly) return null;

  const severityInfo = severityConfig[anomaly.severity as keyof typeof severityConfig];
  const statusInfo = statusConfig[anomaly.status as keyof typeof statusConfig];
  const typeInfo = typeConfig[anomaly.type as keyof typeof typeConfig];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${severityInfo?.bgColor}`}>
                {severityInfo?.icon && React.createElement(severityInfo.icon, {
                  className: `h-6 w-6 ${severityInfo.color}`
                })}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Anomaly Investigation</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={severityInfo?.variant} className="text-xs">
                    {anomaly.severity}
                  </Badge>
                  <Badge variant={statusInfo?.variant} className="text-xs">
                    {statusInfo?.label}
                  </Badge>
                  <span className="text-sm text-gray-400">{typeInfo?.label}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <XCircleIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-300">{anomaly.description}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Timeline & Detection</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">First Detected</span>
                <div className="text-white">
                  {format(new Date(anomaly.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(anomaly.timestamp))} ago
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400">Confidence Score</span>
                <div className="text-white text-lg font-semibold">
                  {(anomaly as ExtendedAnomaly).confidence ? `${((anomaly as ExtendedAnomaly).confidence! * 100).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          {anomaly.metadata && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Technical Details</h3>
              <div className="bg-gray-800 p-4 rounded-lg">
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  {JSON.stringify(anomaly.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Machine Learning Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Pattern Analysis</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>Algorithm: Isolation Forest</div>
                  <div>Model Version: v2.1.3</div>
                  <div>Training Data: Last 30 days</div>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Risk Assessment</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>Impact Score: {anomaly.impact_score || 'Unknown'}</div>
                  <div>False Positive Rate: 12%</div>
                  <div>Similar Patterns: 3 found</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            {anomaly.status === 'active' && (
              <>
                <Button 
                  variant="primary" 
                  className="flex-1"
                  onClick={() => onResolve(anomaly.id)}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => onMarkAsFalsePositive(anomaly.id)}
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  False Positive
                </Button>
              </>
            )}
            <Button variant="secondary">
              <DocumentChartBarIcon className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 p-6">
      <Card className="w-full max-w-md">
        <div className="text-center p-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Anomalies Component Error</h2>
          <p className="text-gray-400 mb-4 text-sm">{error.message}</p>
          <Button
            variant="primary"
            onClick={resetErrorBoundary}
            className="w-full"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Anomaly Table Column Helper
const anomalyColumnHelper = createColumnHelper<ExtendedAnomaly>();

// Anomaly Row Component for react-window
const AnomalyRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: ExtendedAnomaly[] }) => {
  const anomaly = data[index];
  const severityInfo = severityConfig[anomaly.severity as keyof typeof severityConfig];
  const statusInfo = statusConfig[anomaly.status as keyof typeof statusConfig];
  const typeInfo = typeConfig[anomaly.type as keyof typeof typeConfig];

  return (
    <div style={style} className="flex items-center border-b border-gray-700/50 px-6 py-4 text-sm hover:bg-gray-800/30 cursor-pointer">
      <div className="w-32 flex-shrink-0">
        <Badge variant={severityInfo?.variant} className="text-xs">
          {severityInfo?.label}
        </Badge>
      </div>
      <div className="w-32 flex-shrink-0">
        <Badge variant={statusInfo?.variant} className="text-xs">
          {statusInfo?.label}
        </Badge>
      </div>
      <div className="flex-1 text-white truncate pr-4">
        {anomaly.description}
      </div>
      <div className="w-40 flex-shrink-0 text-gray-400 text-xs">
        {formatDistanceToNow(new Date(anomaly.timestamp))} ago
      </div>
      <div className="w-24 flex-shrink-0 text-gray-400 text-xs">
        {anomaly.confidence ? `${(anomaly.confidence * 100).toFixed(1)}%` : 'N/A'}
      </div>
    </div>
  );
});

export const AnomaliesPage: React.FC = () => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showAnomalyDetails, setShowAnomalyDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  // Convert filter states to the format expected by useAnomalies
  const filters = useMemo(() => {
    const result: Record<string, string> = {};
    if (severityFilter !== 'all') result.severity = severityFilter;
    if (statusFilter !== 'all') result.status = statusFilter;
    if (typeFilter !== 'all') result.type = typeFilter;
    if (searchTerm) result.search = searchTerm;
    return result;
  }, [severityFilter, statusFilter, typeFilter, searchTerm]);

  const {
    anomalies,
    total,
    metrics,
    pageSize,
    isLoading,
    isError,
    error,
    resolveAnomaly,
    markAsFalsePositive,
    runAnalysis,
    isResolving,
    isMarkingFalsePositive,
    isAnalyzing,
  } = useAnomalies({
    filters,
    page,
    pageSize: 10,
  });

  // Filter anomalies locally based on search term
  const filteredAnomalies = useMemo(() => {
    if (!searchTerm) return anomalies;
    return anomalies.filter((anomaly: Anomaly) =>
      anomaly.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      anomaly.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [anomalies, searchTerm]);

  // Calculate anomaly statistics
  const anomalyStats = useMemo(() => {
    return {
      total: anomalies.length,
      critical: anomalies.filter((a: Anomaly) => a.severity === 'critical').length,
      high: anomalies.filter((a: Anomaly) => a.severity === 'high').length,
      medium: anomalies.filter((a: Anomaly) => a.severity === 'medium').length,
      low: anomalies.filter((a: Anomaly) => a.severity === 'low').length,
      active: anomalies.filter((a: Anomaly) => a.status === 'active').length,
      resolved: anomalies.filter((a: Anomaly) => a.status === 'resolved').length,
    };
  }, [anomalies]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    setPage(1);
  };

  const toggleSeverity = (severity: string) => {
    setSeverityFilter(severity);
    setPage(1);
  };

  const toggleStatus = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const toggleType = (type: string) => {
    setTypeFilter(type);
    setPage(1);
  };

  const handleResolve = async (anomalyId: string) => {
    try {
      await resolveAnomaly(anomalyId);
      toast({
        title: 'Anomaly Resolved',
        description: 'The anomaly has been marked as resolved.',
        variant: 'success',
      });
      setShowAnomalyDetails(false);
      setSelectedAnomaly(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve the anomaly. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleMarkAsFalsePositive = async (anomalyId: string) => {
    try {
      await markAsFalsePositive(anomalyId);
      toast({
        title: 'Anomaly Marked as False Positive',
        description: 'The anomaly has been marked as a false positive.',
        variant: 'success',
      });
      setShowAnomalyDetails(false);
      setSelectedAnomaly(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark the anomaly as false positive. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleRunAnalysis = async () => {
    try {
      await runAnalysis();
      toast({
        title: 'Analysis Started',
        description: 'A new anomaly analysis has been initiated.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start the analysis. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleAnomalyClick = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    setShowAnomalyDetails(true);
  };

  const clearFilters = () => {
    setSeverityFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchTerm('');
    setPage(1);
  };

  // Anomaly table columns definition
  const anomalyColumns = useMemo<ColumnDef<ExtendedAnomaly, unknown>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => {
          const severity = getValue() as string;
          const severityInfo = severityConfig[severity as keyof typeof severityConfig];
          return (
            <Badge variant={severityInfo?.variant} className="text-xs">
              {severityInfo?.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const statusInfo = statusConfig[status as keyof typeof statusConfig];
          return (
            <Badge variant={statusInfo?.variant} className="text-xs">
              {statusInfo?.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue() as string;
          const typeInfo = typeConfig[type as keyof typeof typeConfig];
          return (
            <span className="text-gray-300">{typeInfo?.label}</span>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ getValue }) => (
          <span className="text-white">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Detected',
        cell: ({ getValue }) => (
          <div className="text-sm text-gray-400">
            {formatDistanceToNow(new Date(getValue() as string))} ago
          </div>
        ),
      },
      {
        accessorKey: 'confidence',
        header: 'Confidence',
        cell: ({ getValue, row }) => {
          const confidence = (row.original as ExtendedAnomaly).confidence;
          return (
            <div className="text-sm text-gray-400">
              {confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A'}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleAnomalyClick(row.original)}
              className="text-xs"
            >
              <EyeIcon className="h-3 w-3 mr-1" />
              View
            </Button>
            {row.original.status === 'active' && (
              <Button
                size="sm"
                variant="success"
                onClick={() => handleResolve(row.original.id)}
                disabled={isResolving}
                className="text-xs"
              >
                Resolve
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isResolving]
  );

  // Anomaly table configuration
  const anomalyTable = useReactTable({
    data: filteredAnomalies,
    columns: anomalyColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <div className="text-center p-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Anomalies</h2>
            <p className="text-gray-400 mb-4">{error?.message || 'An error occurred while loading anomalies.'}</p>
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
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Anomaly Detection</h1>
            <p className="text-gray-400 mt-1">AI-powered anomaly detection and threat analysis</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex items-center gap-2">
              <DocumentChartBarIcon className="h-4 w-4" />
              Analytics Report
            </Button>
            <Button
              variant="primary"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              <BeakerIcon className="h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400">Total Anomalies</p>
                  <p className="text-2xl font-bold text-white mt-1">{anomalyStats.total}</p>
                </div>
                <BugAntIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Detected patterns
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-400">Critical</p>
                  <p className="text-2xl font-bold text-white mt-1">{anomalyStats.critical}</p>
                </div>
                <FireIcon className="h-8 w-8 text-red-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Immediate action required
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-400">High Priority</p>
                  <p className="text-2xl font-bold text-white mt-1">{anomalyStats.high}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Needs investigation
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-400">Medium</p>
                  <p className="text-2xl font-bold text-white mt-1">{anomalyStats.medium}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Monitor closely
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-400">Active</p>
                  <p className="text-2xl font-bold text-white mt-1">{anomalyStats.active}</p>
                </div>
                <BugAntIcon className="h-8 w-8 text-green-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Under investigation
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Resolved</p>
                  <p className="text-2xl font-bold text-white mt-1">{anomalyStats.resolved}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Completed investigations
              </div>
            </div>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 bg-gray-800/20">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search Anomalies</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by description, type, or source..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                    <select
                      value={severityFilter}
                      onChange={(e) => toggleSeverity(e.target.value)}
                      className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => toggleStatus(e.target.value)}
                      className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="false_positive">False Positive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => toggleType(e.target.value)}
                      className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    >
                      <option value="all">All Types</option>
                      <option value="security">Security</option>
                      <option value="network">Network</option>
                      <option value="performance">Performance</option>
                      <option value="behavior">Behavior</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="secondary"
                      onClick={clearFilters}
                      className="px-4 py-3 text-sm"
                    >
                      <XMarkIcon className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </ErrorBoundary>

        {/* Enhanced Anomalies Table */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BugAntIcon className="h-6 w-6 text-red-400" />
                  Detected Anomalies
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>Showing {filteredAnomalies.length} of {total} anomalies</span>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-blue-400 font-medium">Analyzing</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-900/30">
              {isLoading ? (
                <div className="text-center py-12">
                  <BugAntIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-lg font-medium text-white mb-2">Loading Anomalies</h3>
                  <p className="text-gray-400 text-sm">Analyzing patterns...</p>
                </div>
              ) : filteredAnomalies.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Anomalies Found</h3>
                  <p className="text-gray-400 text-sm">
                    {searchTerm || severityFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your search criteria or filters'
                      : 'All systems operating normally'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* React Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        {anomalyTable.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id} className="border-b border-gray-700">
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                className="text-left py-3 px-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <div className="flex items-center gap-2">
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {header.column.getIsSorted() === 'asc' && (
                                    <ChevronUpIcon className="h-4 w-4" />
                                  )}
                                  {header.column.getIsSorted() === 'desc' && (
                                    <ChevronDownIcon className="h-4 w-4" />
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {anomalyTable.getRowModel().rows.map(row => (
                          <tr key={row.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="py-3 px-4 text-sm">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      Showing {anomalyTable.getState().pagination.pageIndex * anomalyTable.getState().pagination.pageSize + 1} to{' '}
                      {Math.min(
                        (anomalyTable.getState().pagination.pageIndex + 1) * anomalyTable.getState().pagination.pageSize,
                        filteredAnomalies.length
                      )}{' '}
                      of {filteredAnomalies.length} anomalies
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => anomalyTable.previousPage()}
                        disabled={!anomalyTable.getCanPreviousPage()}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-400">
                        Page {anomalyTable.getState().pagination.pageIndex + 1} of {anomalyTable.getPageCount()}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => anomalyTable.nextPage()}
                        disabled={!anomalyTable.getCanNextPage()}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </ErrorBoundary>

        {/* Virtualized Anomaly List Alternative (for large datasets) */}
        {filteredAnomalies.length > 50 && (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
              <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <BugAntIcon className="h-5 w-5 text-orange-400" />
                  High-Performance Anomaly List ({filteredAnomalies.length} items)
                </h2>
              </div>
              
              <div className="bg-gray-900/30">
                <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600 z-10">
                  <div className="flex items-center text-sm font-bold text-gray-200 uppercase tracking-wider">
                    <div className="w-32 flex-shrink-0 py-4 px-6">Severity</div>
                    <div className="w-32 flex-shrink-0 py-4 px-6">Status</div>
                    <div className="flex-1 py-4 px-6">Description</div>
                    <div className="w-40 flex-shrink-0 py-4 px-6">Detected</div>
                    <div className="w-24 flex-shrink-0 py-4 px-6">Confidence</div>
                  </div>
                </div>
                
                <List
                  height={400}
                  width={'100%'}
                  itemCount={filteredAnomalies.length}
                  itemSize={60}
                  itemData={filteredAnomalies}
                >
                  {AnomalyRow}
                </List>
              </div>
            </Card>
          </ErrorBoundary>
        )}

        {/* Phase 3: Enterprise Anomaly Events Grid */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Enterprise Anomaly Events</h2>
                <p className="text-sm text-gray-400 mt-1">Advanced anomaly event management and analysis</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Phase 3</span>
                <span>Enterprise Components</span>
              </div>
            </div>

            {/* Simple Security Grid for Anomalies */}
            <SimpleSecurityGrid height={600} className="w-full" />
          </div>
        </ErrorBoundary>

        {/* Anomaly Details Modal */}
        <AnomalyDetailsModal
          anomaly={selectedAnomaly}
          isOpen={showAnomalyDetails}
          onClose={() => {
            setShowAnomalyDetails(false);
            setSelectedAnomaly(null);
          }}
          onResolve={handleResolve}
          onMarkAsFalsePositive={handleMarkAsFalsePositive}
        />
      </div>
    </ErrorBoundary>
  );
}; 