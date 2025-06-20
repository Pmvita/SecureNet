import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  CalendarIcon, 
  ChartBarIcon, 
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ClockIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

/**
 * SecureNet Advanced Analytics Dashboard
 * Day 5 Sprint 1: Real-time analytics with interactive charts and filtering
 */

interface AnalyticsData {
  timestamp: string;
  threats_detected: number;
  successful_logins: number;
  failed_logins: number;  
  api_requests: number;
  response_time: number;
  active_users: number;
  data_processed: number;
  security_score: number;
  system_health: number;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

interface FilterOptions {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  metrics: string[];
  refreshInterval: number;
  autoRefresh: boolean;
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  // State management
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: '24h',
    metrics: ['threats', 'logins', 'performance', 'users'],
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true
  });
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());

  // Refs for real-time updates
  const intervalRef = useRef<NodeJS.Timeout>();
  const websocketRef = useRef<WebSocket>();

  // Generate mock data for demonstration
  const generateMockData = useCallback((hours: number = 24): AnalyticsData[] => {
    const data: AnalyticsData[] = [];
    const now = new Date();
    
    for (let i = hours * 12; i >= 0; i--) { // Every 5 minutes
      const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
      const baseThreats = Math.floor(Math.random() * 5) + (i < 24 ? Math.random() * 10 : 0);
      
      data.push({
        timestamp: timestamp.toISOString(),
        threats_detected: baseThreats + Math.floor(Math.random() * 3),
        successful_logins: Math.floor(Math.random() * 50) + 20,
        failed_logins: Math.floor(Math.random() * 15) + 2,
        api_requests: Math.floor(Math.random() * 1000) + 500,
        response_time: Math.random() * 200 + 50,
        active_users: Math.floor(Math.random() * 100) + 150,
        data_processed: Math.random() * 10 + 5, // GB
        security_score: Math.random() * 20 + 80,
        system_health: Math.random() * 10 + 90
      });
    }
    
    return data;
  }, []);

  // Real-time data fetching
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // In real implementation, this would be an API call
      const timeRangeHours = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
        '30d': 720
      };
      
      const mockData = generateMockData(timeRangeHours[filters.timeRange]);
      setAnalyticsData(mockData);
      
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.timeRange, generateMockData]);

  // WebSocket connection for real-time updates
  const setupWebSocket = useCallback(() => {
    if (!realTimeEnabled) return;

    try {
      const ws = new WebSocket('ws://localhost:8000/ws/analytics');
      
      ws.onopen = () => {
        console.log('Analytics WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const newData = JSON.parse(event.data);
        setAnalyticsData(prev => [...prev.slice(-288), newData]); // Keep last 24 hours (288 5-min intervals)
      };
      
      ws.onclose = () => {
        console.log('Analytics WebSocket disconnected');
        if (realTimeEnabled) {
          setTimeout(setupWebSocket, 5000); // Retry after 5 seconds
        }
      };
      
      websocketRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, [realTimeEnabled]);

  // Effect for data fetching and real-time updates
  useEffect(() => {
    fetchAnalyticsData();
    
    if (filters.autoRefresh) {
      intervalRef.current = setInterval(fetchAnalyticsData, filters.refreshInterval);
    }
    
    if (realTimeEnabled) {
      setupWebSocket();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [fetchAnalyticsData, filters.autoRefresh, filters.refreshInterval, realTimeEnabled, setupWebSocket]);

  // Calculate metrics for cards
  const metricsCards = useMemo((): MetricCard[] => {
    if (!analyticsData.length) return [];
    
    const latest = analyticsData[analyticsData.length - 1];
    const previous = analyticsData[analyticsData.length - 25] || latest; // Compare with ~2 hours ago
    
    const calculateChange = (current: number, prev: number) => {
      return prev > 0 ? ((current - prev) / prev) * 100 : 0;
    };
    
    return [
      {
        title: 'Active Threats',
        value: latest.threats_detected,
        change: calculateChange(latest.threats_detected, previous.threats_detected),
        trend: latest.threats_detected > previous.threats_detected ? 'up' : 
               latest.threats_detected < previous.threats_detected ? 'down' : 'stable',
        icon: ExclamationTriangleIcon,
        color: 'red'
      },
      {
        title: 'Security Score',
        value: `${latest.security_score.toFixed(1)}%`,
        change: calculateChange(latest.security_score, previous.security_score),
        trend: latest.security_score > previous.security_score ? 'up' : 
               latest.security_score < previous.security_score ? 'down' : 'stable',
        icon: ShieldCheckIcon,
        color: 'green'
      },
      {
        title: 'Active Users',
        value: latest.active_users.toLocaleString(),
        change: calculateChange(latest.active_users, previous.active_users),
        trend: latest.active_users > previous.active_users ? 'up' : 
               latest.active_users < previous.active_users ? 'down' : 'stable',
        icon: UserGroupIcon,
        color: 'blue'
      },
      {
        title: 'Avg Response Time',
        value: `${latest.response_time.toFixed(0)}ms`,
        change: calculateChange(latest.response_time, previous.response_time),
        trend: latest.response_time < previous.response_time ? 'up' : 
               latest.response_time > previous.response_time ? 'down' : 'stable',
        icon: ClockIcon,
        color: 'yellow'
      },
      {
        title: 'API Requests',
        value: latest.api_requests.toLocaleString(),
        change: calculateChange(latest.api_requests, previous.api_requests),
        trend: latest.api_requests > previous.api_requests ? 'up' : 
               latest.api_requests < previous.api_requests ? 'down' : 'stable',
        icon: GlobeAltIcon,
        color: 'purple'
      },
      {
        title: 'System Health',
        value: `${latest.system_health.toFixed(1)}%`,
        change: calculateChange(latest.system_health, previous.system_health),
        trend: latest.system_health > previous.system_health ? 'up' : 
               latest.system_health < previous.system_health ? 'down' : 'stable',
        icon: ChartBarIcon,
        color: 'indigo'
      }
    ];
  }, [analyticsData]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
          },
        },
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
        }
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
        }
      }
    },
  };

  // Threat Detection Chart Data
  const threatChartData = {
    labels: analyticsData.map(d => d.timestamp),
    datasets: [
      {
        label: 'Threats Detected',
        data: analyticsData.map(d => d.threats_detected),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Login Activity Chart Data
  const loginChartData = {
    labels: analyticsData.map(d => d.timestamp),
    datasets: [
      {
        label: 'Successful Logins',
        data: analyticsData.map(d => d.successful_logins),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Failed Logins',
        data: analyticsData.map(d => d.failed_logins),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Performance Chart Data
  const performanceChartData = {
    labels: analyticsData.map(d => format(parseISO(d.timestamp), 'HH:mm')),
    datasets: [
      {
        label: 'Response Time (ms)',
        data: analyticsData.map(d => d.response_time),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
    ],
  };

  // Security Score Doughnut Data
  const securityScoreData = useMemo(() => {
    const latest = analyticsData[analyticsData.length - 1];
    if (!latest) return null;
    
    const score = latest.security_score;
    return {
      labels: ['Secure', 'At Risk'],
      datasets: [
        {
          data: [score, 100 - score],
          backgroundColor: [
            score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444',
            '#374151'
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [analyticsData]);

  // Export data function
  const exportData = useCallback(() => {
    const csvContent = [
      'Timestamp,Threats,Successful Logins,Failed Logins,API Requests,Response Time,Active Users,Security Score',
      ...analyticsData.map(d => 
        `${d.timestamp},${d.threats_detected},${d.successful_logins},${d.failed_logins},${d.api_requests},${d.response_time.toFixed(2)},${d.active_users},${d.security_score.toFixed(2)}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securenet-analytics-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [analyticsData]);

  if (loading && !analyticsData.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Advanced Analytics</h1>
          <p className="text-gray-400 mt-1">Real-time security and performance insights</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Time Range Filter */}
          <select
            value={filters.timeRange}
            onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as FilterOptions['timeRange'] }))}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          {/* Real-time Toggle */}
          <button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              realTimeEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {realTimeEnabled ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
            Real-time
          </button>
          
          {/* Export Button */}
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricsCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg bg-${metric.color}-500/20`}>
                <metric.icon className={`w-5 h-5 text-${metric.color}-400`} />
              </div>
              <div className="flex items-center gap-1 text-sm">
                {metric.trend === 'up' ? (
                  <ArrowTrendingUpIcon className={`w-4 h-4 ${metric.color === 'red' ? 'text-red-400' : 'text-green-400'}`} />
                ) : metric.trend === 'down' ? (
                  <ArrowTrendingDownIcon className={`w-4 h-4 ${metric.color === 'red' ? 'text-green-400' : 'text-red-400'}`} />
                ) : null}
                <span className={`${Math.abs(metric.change) > 5 ? 'font-medium' : ''} ${
                  metric.change > 5 ? 'text-green-400' : 
                  metric.change < -5 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white">{metric.value}</div>
              <div className="text-sm text-gray-400 mt-1">{metric.title}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Detection Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 border border-gray-700 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Threat Detection Timeline</h3>
            <button
              onClick={() => {
                const newExpanded = new Set(expandedCharts);
                if (newExpanded.has('threats')) {
                  newExpanded.delete('threats');
                } else {
                  newExpanded.add('threats');
                }
                setExpandedCharts(newExpanded);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
          </div>
          <div className={`${expandedCharts.has('threats') ? 'h-96' : 'h-64'} transition-all duration-300`}>
            <Line data={threatChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Login Activity Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 border border-gray-700 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Login Activity</h3>
            <button
              onClick={() => {
                const newExpanded = new Set(expandedCharts);
                if (newExpanded.has('logins')) {
                  newExpanded.delete('logins');
                } else {
                  newExpanded.add('logins');
                }
                setExpandedCharts(newExpanded);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
          </div>
          <div className={`${expandedCharts.has('logins') ? 'h-96' : 'h-64'} transition-all duration-300`}>
            <Line data={loginChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 border border-gray-700 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">API Performance</h3>
            <button
              onClick={() => {
                const newExpanded = new Set(expandedCharts);
                if (newExpanded.has('performance')) {
                  newExpanded.delete('performance');
                } else {
                  newExpanded.add('performance');
                }
                setExpandedCharts(newExpanded);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
          </div>
          <div className={`${expandedCharts.has('performance') ? 'h-96' : 'h-64'} transition-all duration-300`}>
            <Bar data={performanceChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Security Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 border border-gray-700 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Security Health</h3>
            <ChartPieIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center">
            {securityScoreData && (
              <div className="relative w-48 h-48">
                <Doughnut 
                  data={securityScoreData} 
                  options={{
                    ...chartOptions,
                    cutout: '75%',
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }} 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {analyticsData[analyticsData.length - 1]?.security_score.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-400">Security Score</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Real-time Status */}
      <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${realTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <span className="text-white font-medium">
            {realTimeEnabled ? 'Real-time monitoring active' : 'Real-time monitoring paused'}
          </span>
          <span className="text-gray-400 text-sm">
            Last updated: {format(new Date(), 'HH:mm:ss')}
          </span>
        </div>
        
        <div className="text-gray-400 text-sm">
          Showing {analyticsData.length.toLocaleString()} data points
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard; 