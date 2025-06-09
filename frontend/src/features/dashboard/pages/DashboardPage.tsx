import React from 'react';
import { Card } from '@/components/common/Card';
import { LogEntryCard } from '../../logs/components/LogEntryCard';
import { useLogs, LogEntry } from '../../logs/api/useLogs';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/common/Skeleton';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/common/Badge';
import { useTheme } from '@/hooks/useTheme';
import styles from './DashboardPage.module.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, description, loading }) => {
  const { theme } = useTheme();
  
  if (loading) {
    return (
      <Card className={styles.metricCard}>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-12 w-32 mt-4" />
        <Skeleton className="h-4 w-16 mt-2" />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={styles.metricCard}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={styles.metricIconWrapper}>
                <Icon name={icon} className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
              {trend && (
                <Badge
                  variant={trend.isPositive ? 'success' : 'error'}
                  className="flex items-center gap-1"
                >
                  <Icon
                    name={trend.isPositive ? 'trending-up' : 'trending-down'}
                    className="w-4 h-4"
                  />
                  {Math.abs(trend.value)}%
                </Badge>
              )}
            </div>
            {description && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const SystemStatusCard: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const metrics = [
    { label: 'CPU Usage', value: 45, color: 'var(--primary)' },
    { label: 'Memory Usage', value: 62, color: 'var(--warning)' },
    { label: 'Disk Usage', value: 78, color: 'var(--error)' },
    { label: 'Network Traffic', value: 35, color: 'var(--success)' },
  ];

  if (loading) {
    return (
      <Card className={styles.systemStatusCard}>
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {metrics.map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.systemStatusCard}>
      <h3 className="text-lg font-semibold mb-6">System Status</h3>
      <div className="space-y-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metric.label}
              </span>
              <span className="text-sm font-medium">{metric.value}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: metric.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const RecentLogsCard: React.FC<{ logs: LogEntry[]; loading: boolean }> = ({ logs, loading }) => {
  if (loading) {
    return (
      <Card className={styles.recentLogsCard}>
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.recentLogsCard}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Critical Logs</h3>
        <Badge variant="error" className="px-2 py-1">
          {logs.length} Critical
        </Badge>
      </div>
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon name="check-circle" className="w-12 h-12 text-success mb-4" />
          <h4 className="text-lg font-medium mb-2">All Systems Operational</h4>
          <p className="text-gray-500 dark:text-gray-400">
            No critical logs found in the last 24 hours
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LogEntryCard log={log} compact />
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
};

const ActivityChart: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const data = [
    { time: '00:00', value: 30 },
    { time: '04:00', value: 45 },
    { time: '08:00', value: 75 },
    { time: '12:00', value: 90 },
    { time: '16:00', value: 65 },
    { time: '20:00', value: 40 },
    { time: '24:00', value: 35 },
  ];

  if (loading) {
    return (
      <Card className={styles.activityChartCard}>
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-64 w-full" />
    </Card>
  );
}

  return (
    <Card className={styles.activityChartCard}>
      <h3 className="text-lg font-semibold mb-6">Activity Overview</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ fill: 'var(--primary)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export function DashboardPage() {
  const { data, isLoading: logsLoading } = useLogs({
    page: 1,
    pageSize: 5,
    filters: {
      level: ['error', 'critical'],
    },
  });

  const dashboardMetrics = [
    {
      title: 'Active Threats',
      value: data?.metrics?.recentErrors || 0,
      icon: 'alert-triangle',
      trend: { value: 50, isPositive: false },
      description: 'Critical security events requiring attention',
    },
    {
      title: 'Network Health',
      value: '98%',
      icon: 'globe',
      trend: { value: 2, isPositive: true },
      description: 'Overall network performance score',
    },
    {
      title: 'System Uptime',
      value: '99.9%',
      icon: 'clock',
      description: 'Last 30 days system availability',
    },
    {
      title: 'Security Score',
      value: 'A+',
      icon: 'shield',
      trend: { value: 5, isPositive: true },
      description: 'Current security posture rating',
    },
  ];

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.metricsGrid}>
        {dashboardMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            {...metric}
            loading={logsLoading}
          />
        ))}
      </div>

      <div className={styles.chartsGrid}>
        <ActivityChart loading={logsLoading} />
        <SystemStatusCard loading={logsLoading} />
      </div>

      <RecentLogsCard logs={data?.logs || []} loading={logsLoading} />
    </div>
  );
} 