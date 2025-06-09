import React, { useState, useMemo } from 'react';
import { useAnomalies, type Anomaly, type AnomalyMetrics } from '../api/useAnomalies';

// Extended Anomaly interface with optional properties
interface ExtendedAnomaly extends Anomaly {
  confidence?: number;
  metadata?: any;
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
} from '@heroicons/react/24/outline';

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
                   {(anomaly as any).confidence ? `${((anomaly as any).confidence * 100).toFixed(1)}%` : 'N/A'}
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
    return anomalies.filter(anomaly =>
      anomaly.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      anomaly.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [anomalies, searchTerm]);

  // Calculate anomaly statistics
  const anomalyStats = useMemo(() => {
    return {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      low: anomalies.filter(a => a.severity === 'low').length,
      active: anomalies.filter(a => a.status === 'active').length,
      resolved: anomalies.filter(a => a.status === 'resolved').length,
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
                <p className="text-sm font-medium text-yellow-400">Active</p>
                <p className="text-2xl font-bold text-white mt-1">{anomalyStats.active}</p>
              </div>
              <ExclamationCircleIcon className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Currently investigating
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-400">Resolved</p>
                <p className="text-2xl font-bold text-white mt-1">{anomalyStats.resolved}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Successfully handled
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-400">ML Accuracy</p>
                <p className="text-2xl font-bold text-white mt-1">94.2%</p>
              </div>
              <LightBulbIcon className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Model performance
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search anomalies by description or type..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'active' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => toggleStatus(statusFilter === 'active' ? 'all' : 'active')}
              >
                Active Only
              </Button>
              <Button
                variant={severityFilter === 'critical' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => toggleSeverity(severityFilter === 'critical' ? 'all' : 'critical')}
              >
                Critical
              </Button>
            </div>

            {/* Filter Toggle */}
            <Button
              variant="secondary"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
              {(severityFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all') && (
                <Badge variant="info" className="text-xs">
                  {[severityFilter, statusFilter, typeFilter].filter(f => f !== 'all').length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {isFilterOpen && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Severity Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Severity</h3>
                  <div className="space-y-2">
                    {Object.entries(severityConfig).map(([severity, config]) => (
                      <button
                        key={severity}
                        onClick={() => toggleSeverity(severityFilter === severity ? 'all' : severity)}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-all ${
                          severityFilter === severity
                            ? `${config.bgColor} border-opacity-50 ${config.color}`
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {React.createElement(config.icon, { className: 'h-4 w-4' })}
                        <span className="text-sm">{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Status</h3>
                  <div className="space-y-2">
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(statusFilter === status ? 'all' : status)}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-all ${
                          statusFilter === status
                            ? `${config.bgColor} border-opacity-50 ${config.color}`
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {React.createElement(config.icon, { className: 'h-4 w-4' })}
                        <span className="text-sm">{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Type</h3>
                  <div className="space-y-2">
                    {Object.entries(typeConfig).map(([type, config]) => (
                      <button
                        key={type}
                        onClick={() => toggleType(typeFilter === type ? 'all' : type)}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-all ${
                          typeFilter === type
                            ? `bg-gray-700 border-gray-600 ${config.color}`
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {React.createElement(config.icon, { className: 'h-4 w-4' })}
                        <span className="text-sm">{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(severityFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <Button variant="secondary" onClick={clearFilters} className="text-sm">
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Anomalies List */}
      <Card>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BugAntIcon className="h-5 w-5" />
              Detected Anomalies
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Showing {filteredAnomalies.length} of {total} anomalies</span>
              {isAnalyzing && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span>Analyzing</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <BugAntIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
            <div className="space-y-3">
              {filteredAnomalies.map((anomaly) => {
                const severityInfo = severityConfig[anomaly.severity as keyof typeof severityConfig];
                const statusInfo = statusConfig[anomaly.status as keyof typeof statusConfig];
                const typeInfo = typeConfig[anomaly.type as keyof typeof typeConfig];

                return (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-lg border transition-colors hover:border-gray-600 cursor-pointer ${
                      severityInfo?.bgColor || 'bg-gray-800/50 border-gray-700'
                    }`}
                    onClick={() => handleAnomalyClick(anomaly)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={severityInfo?.variant} className="text-xs">
                            {severityInfo?.label}
                          </Badge>
                          <Badge variant={statusInfo?.variant} className="text-xs">
                            {statusInfo?.label}
                          </Badge>
                          <span className="text-xs text-gray-400">{typeInfo?.label}</span>
                          {anomaly.confidence && (
                            <span className="text-xs text-gray-400">
                              {(anomaly.confidence * 100).toFixed(1)}% confidence
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-white mb-1">
                          {anomaly.description}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <ClockIcon className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(anomaly.timestamp))} ago
                          </span>
                          {anomaly.impact_score && (
                            <span>
                              <ChartBarIcon className="h-3 w-3 inline mr-1" />
                              Impact: {anomaly.impact_score}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {typeInfo?.icon && React.createElement(typeInfo.icon, {
                          className: `h-5 w-5 ${typeInfo.color}`
                        })}
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > (pageSize || 10) && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * (pageSize || 10) + 1} to {Math.min(page * (pageSize || 10), total)} of {total} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * (pageSize || 10) >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

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
  );
}; 