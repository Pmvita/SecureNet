import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheckIcon, ExclamationTriangleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SecurityScan {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  findings: SecurityFinding[];
}

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  timestamp: string;
}

interface SecurityStats {
  totalScans: number;
  activeThreats: number;
  resolvedThreats: number;
  securityScore: number;
  scanHistory: {
    date: string;
    score: number;
  }[];
}

async function fetchSecurityStats(): Promise<SecurityStats> {
  const response = await fetch('/api/security/stats');
  if (!response.ok) throw new Error('Failed to fetch security stats');
  return response.json();
}

async function fetchActiveScans(): Promise<SecurityScan[]> {
  const response = await fetch('/api/security/scans/active');
  if (!response.ok) throw new Error('Failed to fetch active scans');
  return response.json();
}

async function startSecurityScan(): Promise<SecurityScan> {
  const response = await fetch('/api/security/scan/start', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to start security scan');
  return response.json();
}

const severityColors = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-green-500 bg-green-500/10',
};

export default function Security() {
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['securityStats'],
    queryFn: fetchSecurityStats,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const { data: activeScans, isLoading: scansLoading } = useQuery({
    queryKey: ['activeScans'],
    queryFn: fetchActiveScans,
    refetchInterval: 30000, // Changed from 5000 to 30000
    staleTime: 15000, // Consider data fresh for 15 seconds
  });

  const startScanMutation = useMutation({
    mutationFn: startSecurityScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeScans'] });
    },
  });

  const chartData = {
    labels: stats?.scanHistory.map(h => new Date(h.date).toLocaleDateString()) ?? [],
    datasets: [
      {
        label: 'Security Score',
        data: stats?.scanHistory.map(h => h.score) ?? [],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Security Score History',
        color: '#fff',
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Security Center</h1>
        <button
          className="btn-primary"
          onClick={() => startScanMutation.mutate()}
          disabled={startScanMutation.isPending}
        >
          {startScanMutation.isPending ? 'Starting Scan...' : 'Start New Scan'}
        </button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Security Score</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  `${stats?.securityScore ?? 0}%`
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-500/10">
              <ShieldCheckIcon className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Threats</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.activeThreats ?? 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Scans</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.totalScans ?? 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <ClockIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Resolved Threats</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {statsLoading ? (
                  <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  stats?.resolvedThreats ?? 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Score Chart */}
      <div className="glass-card p-6">
        <div className="h-80">
          {statsLoading ? (
            <div className="h-full w-full bg-gray-700 animate-pulse rounded"></div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Active Scans */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-medium text-white mb-4">Active Scans</h2>
        {scansLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 animate-pulse rounded"></div>
            ))}
          </div>
        ) : activeScans?.length === 0 ? (
          <p className="text-gray-400">No active scans</p>
        ) : (
          <div className="space-y-4">
            {activeScans?.map((scan) => (
              <div
                key={scan.id}
                className="glass-card p-4 cursor-pointer hover:bg-dark-100/80"
                onClick={() => setSelectedScan(scan.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Scan ID: {scan.id}
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      Started: {new Date(scan.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      scan.status === 'running'
                        ? 'bg-blue-500/10 text-blue-500'
                        : scan.status === 'completed'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {scan.status}
                    </span>
                    <span className="text-sm text-gray-400">
                      {scan.findings.length} findings
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Scan Details */}
      {selectedScan && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Scan Details</h2>
            <button
              className="text-gray-400 hover:text-white"
              onClick={() => setSelectedScan(null)}
            >
              Close
            </button>
          </div>
          {activeScans?.find(scan => scan.id === selectedScan)?.findings.map((finding) => (
            <div key={finding.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{finding.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{finding.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-sm ${severityColors[finding.severity]}`}>
                    {finding.severity}
                  </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    finding.status === 'open'
                      ? 'bg-red-500/10 text-red-500'
                      : finding.status === 'in_progress'
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : 'bg-green-500/10 text-green-500'
                  }`}>
                    {finding.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 