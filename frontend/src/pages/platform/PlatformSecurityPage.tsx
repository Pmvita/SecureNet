import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { apiClient } from '../../api/client';
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ChartBarIcon,
  CpuChipIcon,
  GlobeAltIcon,
  BugAntIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

interface PlatformSecurityMetrics {
  global_threat_level: 'low' | 'medium' | 'high' | 'critical';
  active_threats_across_platform: number;
  customers_affected: number;
  infrastructure_vulnerabilities: number;
  api_security_score: number;
  database_security_score: number;
  network_security_score: number;
  incident_response_time: number;
  threat_intelligence: {
    new_cves_today: number;
    blocked_attacks: number;
    suspicious_activities: number;
  };
}

const PlatformSecurityPage: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PlatformSecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformSecurityMetrics();
  }, []);

  const fetchPlatformSecurityMetrics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from a platform-wide security API
      // For now, we'll show mock data that represents platform-level security
      setMetrics({
        global_threat_level: 'medium',
        active_threats_across_platform: 12,
        customers_affected: 3,
        infrastructure_vulnerabilities: 5,
        api_security_score: 94,
        database_security_score: 97,
        network_security_score: 89,
        incident_response_time: 4.2,
        threat_intelligence: {
          new_cves_today: 8,
          blocked_attacks: 247,
          suspicious_activities: 15
        }
      });
    } catch (error) {
      console.error('Error fetching platform security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'critical': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading platform security metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Platform Security Center</h1>
          </div>
          <p className="text-gray-400">
            Global security overview for the entire SecureNet platform infrastructure
          </p>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              👑 <strong>Founder View:</strong> This dashboard shows platform-wide security metrics across all customers and infrastructure components.
            </p>
          </div>
        </div>

        {/* Global Threat Level */}
        <div className="mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Global Threat Level</h2>
                <div className={`inline-flex items-center px-4 py-2 rounded-lg ${getThreatLevelColor(metrics?.global_threat_level || 'medium')}`}>
                  <FireIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium uppercase">{metrics?.global_threat_level}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Last Updated</p>
                <p className="text-white">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{metrics?.active_threats_across_platform}</span>
            </div>
            <h3 className="text-white font-semibold">Active Threats</h3>
            <p className="text-gray-400 text-sm">Across all customers</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <GlobeAltIcon className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-orange-400">{metrics?.customers_affected}</span>
            </div>
            <h3 className="text-white font-semibold">Customers Affected</h3>
            <p className="text-gray-400 text-sm">Require attention</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <BugAntIcon className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{metrics?.infrastructure_vulnerabilities}</span>
            </div>
            <h3 className="text-white font-semibold">Infrastructure Vulns</h3>
            <p className="text-gray-400 text-sm">Platform components</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ChartBarIcon className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-blue-400">{metrics?.incident_response_time}min</span>
            </div>
            <h3 className="text-white font-semibold">Avg Response Time</h3>
            <p className="text-gray-400 text-sm">Security incidents</p>
          </div>
        </div>

        {/* Security Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CpuChipIcon className="w-6 h-6 text-green-400" />
              <h3 className="text-white font-semibold">API Security</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-green-400 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${metrics?.api_security_score}%` }}
                ></div>
              </div>
              <span className="text-white font-bold">{metrics?.api_security_score}%</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <LockClosedIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-white font-semibold">Database Security</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-blue-400 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${metrics?.database_security_score}%` }}
                ></div>
              </div>
              <span className="text-white font-bold">{metrics?.database_security_score}%</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <GlobeAltIcon className="w-6 h-6 text-purple-400" />
              <h3 className="text-white font-semibold">Network Security</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-purple-400 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${metrics?.network_security_score}%` }}
                ></div>
              </div>
              <span className="text-white font-bold">{metrics?.network_security_score}%</span>
            </div>
          </div>
        </div>

        {/* Threat Intelligence */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Real-time Threat Intelligence</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {metrics?.threat_intelligence.new_cves_today}
              </div>
              <p className="text-gray-400">New CVEs Today</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {metrics?.threat_intelligence.blocked_attacks}
              </div>
              <p className="text-gray-400">Blocked Attacks</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                {metrics?.threat_intelligence.suspicious_activities}
              </div>
              <p className="text-gray-400">Suspicious Activities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSecurityPage;