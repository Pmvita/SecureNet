import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';

interface UserActivityData {
  date: string;
  logins: number;
  actions: number;
  groupChanges: number;
  permissionChanges: number;
}

interface GroupMembershipTrend {
  groupName: string;
  currentMembers: number;
  previousMembers: number;
  change: number;
  changePercent: number;
}

interface PermissionUsageStats {
  permission: string;
  usageCount: number;
  userCount: number;
  lastUsed: string;
  category: string;
}

interface ComplianceMetrics {
  framework: string;
  score: number;
  status: 'compliant' | 'warning' | 'non-compliant';
  lastAudit: string;
  nextAudit: string;
}

const UserManagementAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [userActivityData, setUserActivityData] = useState<UserActivityData[]>([]);
  const [groupTrends, setGroupTrends] = useState<GroupMembershipTrend[]>([]);
  const [permissionStats, setPermissionStats] = useState<PermissionUsageStats[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics[]>([]);

  // Color schemes for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  const COMPLIANCE_COLORS = {
    compliant: '#10B981',
    warning: '#F59E0B', 
    'non-compliant': '#EF4444'
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API calls to load analytics data
      await Promise.all([
        loadUserActivityData(),
        loadGroupMembershipTrends(),
        loadPermissionUsageStats(),
        loadComplianceMetrics()
      ]);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivityData = async () => {
    // Simulate user activity data with trend analysis
    const mockData: UserActivityData[] = [
      { date: '2024-01-01', logins: 245, actions: 1420, groupChanges: 12, permissionChanges: 8 },
      { date: '2024-01-02', logins: 198, actions: 1156, groupChanges: 15, permissionChanges: 5 },
      { date: '2024-01-03', logins: 267, actions: 1580, groupChanges: 8, permissionChanges: 12 },
      { date: '2024-01-04', logins: 289, actions: 1720, groupChanges: 18, permissionChanges: 9 },
      { date: '2024-01-05', logins: 234, actions: 1390, groupChanges: 6, permissionChanges: 7 },
      { date: '2024-01-06', logins: 156, actions: 890, groupChanges: 3, permissionChanges: 2 },
      { date: '2024-01-07', logins: 178, actions: 1020, groupChanges: 5, permissionChanges: 4 }
    ];
    setUserActivityData(mockData);
  };

  const loadGroupMembershipTrends = async () => {
    // Simulate group membership trend data with analytics
    const mockTrends: GroupMembershipTrend[] = [
      { groupName: 'Security Admins', currentMembers: 15, previousMembers: 12, change: 3, changePercent: 25 },
      { groupName: 'SOC Analysts', currentMembers: 42, previousMembers: 38, change: 4, changePercent: 10.5 },
      { groupName: 'Network Admins', currentMembers: 8, previousMembers: 10, change: -2, changePercent: -20 },
      { groupName: 'Compliance Team', currentMembers: 6, previousMembers: 5, change: 1, changePercent: 20 },
      { groupName: 'Executive Team', currentMembers: 4, previousMembers: 4, change: 0, changePercent: 0 },
      { groupName: 'Contractors', currentMembers: 23, previousMembers: 28, change: -5, changePercent: -17.9 }
    ];
    setGroupTrends(mockTrends);
  };

  const loadPermissionUsageStats = async () => {
    // Simulate permission usage analytics and statistics
    const mockStats: PermissionUsageStats[] = [
      { permission: 'user.read', usageCount: 15420, userCount: 89, lastUsed: '2024-01-07T10:30:00Z', category: 'User Management' },
      { permission: 'security.monitor', usageCount: 8760, userCount: 45, lastUsed: '2024-01-07T09:15:00Z', category: 'Security' },
      { permission: 'admin.manage', usageCount: 2340, userCount: 12, lastUsed: '2024-01-07T08:45:00Z', category: 'Administration' },
      { permission: 'compliance.audit', usageCount: 1890, userCount: 8, lastUsed: '2024-01-06T16:20:00Z', category: 'Compliance' },
      { permission: 'network.configure', usageCount: 1560, userCount: 6, lastUsed: '2024-01-07T07:30:00Z', category: 'Network' },
      { permission: 'report.generate', usageCount: 890, userCount: 15, lastUsed: '2024-01-07T11:00:00Z', category: 'Reporting' }
    ];
    setPermissionStats(mockStats);
  };

  const loadComplianceMetrics = async () => {
    // Simulate compliance metrics dashboard and monitoring
    const mockMetrics: ComplianceMetrics[] = [
      { framework: 'SOC 2 Type II', score: 94, status: 'compliant', lastAudit: '2024-01-01', nextAudit: '2024-07-01' },
      { framework: 'ISO 27001', score: 87, status: 'warning', lastAudit: '2024-01-15', nextAudit: '2024-07-15' },
      { framework: 'GDPR', score: 96, status: 'compliant', lastAudit: '2024-01-10', nextAudit: '2024-04-10' },
      { framework: 'HIPAA', score: 78, status: 'warning', lastAudit: '2024-01-05', nextAudit: '2024-04-05' },
      { framework: 'FedRAMP', score: 65, status: 'non-compliant', lastAudit: '2024-01-20', nextAudit: '2024-02-20' }
    ];
    setComplianceMetrics(mockMetrics);
  };

  const activitySummary = useMemo(() => {
    const totalLogins = userActivityData.reduce((sum, day) => sum + day.logins, 0);
    const totalActions = userActivityData.reduce((sum, day) => sum + day.actions, 0);
    const totalGroupChanges = userActivityData.reduce((sum, day) => sum + day.groupChanges, 0);
    const totalPermissionChanges = userActivityData.reduce((sum, day) => sum + day.permissionChanges, 0);
    
    return {
      avgDailyLogins: Math.round(totalLogins / userActivityData.length),
      avgDailyActions: Math.round(totalActions / userActivityData.length),
      totalGroupChanges,
      totalPermissionChanges
    };
  }, [userActivityData]);

  const renderActivityChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={userActivityData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
        <YAxis />
        <Tooltip 
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
          formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        <Legend />
        <Area type="monotone" dataKey="logins" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
        <Area type="monotone" dataKey="actions" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderGroupTrendsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={groupTrends} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="groupName" type="category" width={120} />
        <Tooltip formatter={(value, name) => [value, name === 'currentMembers' ? 'Current Members' : 'Previous Members']} />
        <Legend />
        <Bar dataKey="currentMembers" fill="#3B82F6" name="Current Members" />
        <Bar dataKey="previousMembers" fill="#94A3B8" name="Previous Members" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPermissionUsageChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={permissionStats}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey="usageCount"
          label={({ permission, usageCount }) => `${permission}: ${usageCount}`}
        >
          {permissionStats.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Usage Count']} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderComplianceChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={complianceMetrics}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="framework" />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(value) => [`${value}%`, 'Compliance Score']} />
        <Bar dataKey="score" fill="#3B82F6">
          {complianceMetrics.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COMPLIANCE_COLORS[entry.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading analytics dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management Analytics</h1>
          <p className="text-gray-600">Advanced analytics and insights for user management operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: '1d', label: 'Last 24 hours' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' }
            ]}
          />
          <Button onClick={loadAnalyticsData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Daily Logins</p>
              <p className="text-2xl font-bold text-gray-900">{activitySummary.avgDailyLogins}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Daily Actions</p>
              <p className="text-2xl font-bold text-gray-900">{activitySummary.avgDailyActions}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Group Changes</p>
              <p className="text-2xl font-bold text-gray-900">{activitySummary.totalGroupChanges}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Permission Changes</p>
              <p className="text-2xl font-bold text-gray-900">{activitySummary.totalPermissionChanges}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Tabs with comprehensive visualization */}
      <Tabs
        tabs={[
          {
            id: 'activity',
            label: 'User Activity Patterns',
            content: (
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">User Activity Trends</h3>
                  <p className="text-gray-600">Daily user login and action patterns with behavior visualization</p>
                </div>
                {renderActivityChart()}
              </Card>
            )
          },
          {
            id: 'groups',
            label: 'Group Membership Trends',
            content: (
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Group Membership Analytics</h3>
                  <p className="text-gray-600">Current vs previous group membership counts with trend analysis</p>
                </div>
                {renderGroupTrendsChart()}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Membership Changes</h4>
                  <div className="space-y-2">
                    {groupTrends.map((group, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{group.groupName}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{group.currentMembers} members</span>
                          <Badge 
                            variant={group.change > 0 ? 'success' : group.change < 0 ? 'danger' : 'secondary'}
                          >
                            {group.change > 0 ? '+' : ''}{group.change} ({group.changePercent > 0 ? '+' : ''}{group.changePercent}%)
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          },
          {
            id: 'permissions',
            label: 'Permission Usage Analytics',
            content: (
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Permission Usage Statistics</h3>
                  <p className="text-gray-600">Most frequently used permissions and access pattern analytics</p>
                </div>
                {renderPermissionUsageChart()}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Permission Details</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Count</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Count</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {permissionStats.map((stat, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.permission}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.usageCount.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.userCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(stat.lastUsed).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )
          },
          {
            id: 'compliance',
            label: 'Compliance Metrics Dashboard',
            content: (
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Compliance Monitoring Dashboard</h3>
                  <p className="text-gray-600">Real-time compliance status across all frameworks with monitoring</p>
                </div>
                {renderComplianceChart()}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Compliance Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {complianceMetrics.map((metric, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{metric.framework}</h5>
                          <Badge 
                            variant={
                              metric.status === 'compliant' ? 'success' : 
                              metric.status === 'warning' ? 'warning' : 'danger'
                            }
                          >
                            {metric.status}
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{metric.score}%</div>
                        <div className="text-sm text-gray-600">
                          <div>Last audit: {new Date(metric.lastAudit).toLocaleDateString()}</div>
                          <div>Next audit: {new Date(metric.nextAudit).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          }
        ]}
        defaultTab="activity"
      />
    </div>
  );
};

export default UserManagementAnalyticsDashboard; 