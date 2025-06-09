import { useQuery } from '@tanstack/react-query';
import { ShieldCheckIcon, ExclamationTriangleIcon, GlobeAltIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface DashboardStats {
  securityScore: number;
  activeThreats: number;
  networkDevices: number;
  totalLogs: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/stats/overview');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
}

const statCards = [
  {
    name: 'Security Score',
    value: 'score',
    icon: ShieldCheckIcon,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    name: 'Active Threats',
    value: 'threats',
    icon: ExclamationTriangleIcon,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    name: 'Network Devices',
    value: 'devices',
    icon: GlobeAltIcon,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    name: 'Total Logs',
    value: 'logs',
    icon: ChartBarIcon,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Error loading dashboard data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{card.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {isLoading ? (
                      <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      stats?.[card.value as keyof DashboardStats] ?? '-'
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 animate-pulse rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Activity items will be added here */}
            <p className="text-gray-400">No recent activity</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="btn-primary">
            Start Security Scan
          </button>
          <button className="btn-primary">
            View Latest Logs
          </button>
          <button className="btn-primary">
            Check Network Status
          </button>
        </div>
      </div>
    </div>
  );
} 