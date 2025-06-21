import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter
} from 'recharts';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { Alert } from '../../components/common/Alert';
import { Modal } from '../../components/common/Modal';

interface SecurityViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
  user?: string;
  ipAddress: string;
  riskScore: number;
}

interface ThreatMetrics {
  timestamp: string;
  threatsDetected: number;
  threatsBlocked: number;
  riskScore: number;
  activeIncidents: number;
}

interface ComplianceStatus {
  framework: string;
  score: number;
  status: 'compliant' | 'partial' | 'non-compliant';
  controls: number;
  lastAssessment: string;
  nextAssessment: string;
}

interface SecurityPolicy {
  id: string;
  name: string;
  type: string;
  enforcement: string;
  violations: number;
  lastUpdated: string;
  active: boolean;
}

interface DeviceTrust {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  trustLevel: 'trusted' | 'limited' | 'unknown' | 'blocked';
  user: string;
  lastSeen: string;
  riskFactors: string[];
}

const SecurityDashboardEnhancement: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedIncident, setSelectedIncident] = useState<SecurityViolation | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // State for security data
  const [securityViolations, setSecurityViolations] = useState<SecurityViolation[]>([]);
  const [threatMetrics, setThreatMetrics] = useState<ThreatMetrics[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>([]);
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([]);
  const [deviceTrust, setDeviceTrust] = useState<DeviceTrust[]>([]);

  // Color schemes for different severity levels and statuses
  const SEVERITY_COLORS = {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#EF4444',
    critical: '#DC2626'
  };

  const TRUST_COLORS = {
    trusted: '#10B981',
    limited: '#F59E0B',
    unknown: '#6B7280',
    blocked: '#EF4444'
  };

  const COMPLIANCE_COLORS = {
    compliant: '#10B981',
    partial: '#F59E0B',
    'non-compliant': '#EF4444'
  };

  useEffect(() => {
    loadSecurityData();
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadSecurityData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange, autoRefresh]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSecurityViolations(),
        loadThreatMetrics(),
        loadComplianceStatus(),
        loadSecurityPolicies(),
        loadDeviceTrust()
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityViolations = async () => {
    // Simulate security violations data
    const mockViolations: SecurityViolation[] = [
      {
        id: 'viol_001',
        type: 'Failed Login Attempts',
        severity: 'high',
        description: 'Multiple failed login attempts detected from suspicious IP',
        timestamp: '2024-01-07T10:30:00Z',
        status: 'investigating',
        user: 'user@example.com',
        ipAddress: '192.168.1.100',
        riskScore: 85
      },
      {
        id: 'viol_002',
        type: 'Suspicious Location',
        severity: 'medium',
        description: 'Login attempt from unusual geographic location',
        timestamp: '2024-01-07T09:15:00Z',
        status: 'open',
        user: 'admin@company.com',
        ipAddress: '203.0.113.45',
        riskScore: 65
      },
      {
        id: 'viol_003',
        type: 'Privilege Escalation',
        severity: 'critical',
        description: 'Unauthorized attempt to access admin functions',
        timestamp: '2024-01-07T08:45:00Z',
        status: 'open',
        user: 'contractor@temp.com',
        ipAddress: '198.51.100.23',
        riskScore: 95
      },
      {
        id: 'viol_004',
        type: 'Policy Violation',
        severity: 'low',
        description: 'Access attempt outside business hours',
        timestamp: '2024-01-07T02:20:00Z',
        status: 'resolved',
        user: 'employee@company.com',
        ipAddress: '192.168.1.150',
        riskScore: 35
      },
      {
        id: 'viol_005',
        type: 'Untrusted Device',
        severity: 'medium',
        description: 'Login from unregistered device',
        timestamp: '2024-01-07T07:30:00Z',
        status: 'investigating',
        user: 'user@example.com',
        ipAddress: '10.0.0.45',
        riskScore: 70
      }
    ];
    setSecurityViolations(mockViolations);
  };

  const loadThreatMetrics = async () => {
    // Simulate threat metrics over time
    const mockMetrics: ThreatMetrics[] = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      threatsDetected: Math.floor(Math.random() * 50) + 10,
      threatsBlocked: Math.floor(Math.random() * 40) + 5,
      riskScore: Math.floor(Math.random() * 30) + 40,
      activeIncidents: Math.floor(Math.random() * 5) + 1
    }));
    setThreatMetrics(mockMetrics);
  };

  const loadComplianceStatus = async () => {
    // Simulate compliance framework status
    const mockCompliance: ComplianceStatus[] = [
      {
        framework: 'SOC 2 Type II',
        score: 94,
        status: 'compliant',
        controls: 28,
        lastAssessment: '2024-01-01',
        nextAssessment: '2024-07-01'
      },
      {
        framework: 'ISO 27001',
        score: 87,
        status: 'partial',
        controls: 35,
        lastAssessment: '2024-01-15',
        nextAssessment: '2024-07-15'
      },
      {
        framework: 'GDPR',
        score: 96,
        status: 'compliant',
        controls: 22,
        lastAssessment: '2024-01-10',
        nextAssessment: '2024-04-10'
      },
      {
        framework: 'HIPAA',
        score: 78,
        status: 'partial',
        controls: 18,
        lastAssessment: '2024-01-05',
        nextAssessment: '2024-04-05'
      },
      {
        framework: 'FedRAMP',
        score: 65,
        status: 'non-compliant',
        controls: 42,
        lastAssessment: '2024-01-20',
        nextAssessment: '2024-02-20'
      }
    ];
    setComplianceStatus(mockCompliance);
  };

  const loadSecurityPolicies = async () => {
    // Simulate security policies data
    const mockPolicies: SecurityPolicy[] = [
      {
        id: 'pol_001',
        name: 'Multi-Factor Authentication Policy',
        type: 'Authentication',
        enforcement: 'Strict',
        violations: 2,
        lastUpdated: '2024-01-01',
        active: true
      },
      {
        id: 'pol_002',
        name: 'Time-Based Access Control',
        type: 'Access Control',
        enforcement: 'Moderate',
        violations: 8,
        lastUpdated: '2024-01-05',
        active: true
      },
      {
        id: 'pol_003',
        name: 'Geographic Access Restrictions',
        type: 'Location Control',
        enforcement: 'Strict',
        violations: 3,
        lastUpdated: '2024-01-03',
        active: true
      },
      {
        id: 'pol_004',
        name: 'Device Trust Management',
        type: 'Device Control',
        enforcement: 'Strict',
        violations: 5,
        lastUpdated: '2024-01-02',
        active: true
      },
      {
        id: 'pol_005',
        name: 'Enhanced Password Security',
        type: 'Password Control',
        enforcement: 'Strict',
        violations: 1,
        lastUpdated: '2024-01-04',
        active: true
      }
    ];
    setSecurityPolicies(mockPolicies);
  };

  const loadDeviceTrust = async () => {
    // Simulate device trust data
    const mockDevices: DeviceTrust[] = [
      {
        deviceId: 'dev_001',
        deviceName: 'CEO MacBook Pro',
        deviceType: 'laptop',
        trustLevel: 'trusted',
        user: 'ceo@company.com',
        lastSeen: '2024-01-07T10:30:00Z',
        riskFactors: ['corporate_managed', 'encrypted']
      },
      {
        deviceId: 'dev_002',
        deviceName: 'Admin ThinkPad X1',
        deviceType: 'laptop',
        trustLevel: 'trusted',
        user: 'admin@company.com',
        lastSeen: '2024-01-07T09:15:00Z',
        riskFactors: ['corporate_managed']
      },
      {
        deviceId: 'dev_003',
        deviceName: 'Unknown Device',
        deviceType: 'unknown',
        trustLevel: 'unknown',
        user: 'contractor@temp.com',
        lastSeen: '2024-01-07T08:45:00Z',
        riskFactors: ['unmanaged', 'suspicious_location']
      },
      {
        deviceId: 'dev_004',
        deviceName: 'Personal iPhone',
        deviceType: 'mobile',
        trustLevel: 'limited',
        user: 'employee@company.com',
        lastSeen: '2024-01-07T07:20:00Z',
        riskFactors: ['personal_device']
      },
      {
        deviceId: 'dev_005',
        deviceName: 'Blocked Device',
        deviceType: 'laptop',
        trustLevel: 'blocked',
        user: 'suspicious@user.com',
        lastSeen: '2024-01-06T15:30:00Z',
        riskFactors: ['malware_detected', 'policy_violation']
      }
    ];
    setDeviceTrust(mockDevices);
  };

  const securityMetrics = useMemo(() => {
    const totalViolations = securityViolations.length;
    const openViolations = securityViolations.filter(v => v.status === 'open').length;
    const criticalViolations = securityViolations.filter(v => v.severity === 'critical').length;
    const avgRiskScore = securityViolations.reduce((sum, v) => sum + v.riskScore, 0) / totalViolations || 0;
    
    return {
      totalViolations,
      openViolations,
      criticalViolations,
      avgRiskScore: Math.round(avgRiskScore)
    };
  }, [securityViolations]);

  const handleIncidentClick = (violation: SecurityViolation) => {
    setSelectedIncident(violation);
    setShowIncidentModal(true);
  };

  const handleIncidentResponse = (action: string) => {
    if (selectedIncident) {
      // Update incident status
      const updatedViolations = securityViolations.map(v => 
        v.id === selectedIncident.id 
          ? { ...v, status: action === 'resolve' ? 'resolved' : 'investigating' }
          : v
      );
      setSecurityViolations(updatedViolations);
      setShowIncidentModal(false);
    }
  };

  const renderThreatVisualization = () => (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Real-Time Threat Detection</h3>
        <div className="flex items-center space-x-2">
          <Badge variant={autoRefresh ? "success" : "secondary"}>
            {autoRefresh ? "Live" : "Paused"}
          </Badge>
          <Button
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={threatMetrics}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
            formatter={(value, name) => [value, name.replace(/([A-Z])/g, ' $1').trim()]}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="threatsDetected" 
            stackId="1" 
            stroke="#EF4444" 
            fill="#EF4444" 
            fillOpacity={0.6}
            name="Threats Detected"
          />
          <Area 
            type="monotone" 
            dataKey="threatsBlocked" 
            stackId="2" 
            stroke="#10B981" 
            fill="#10B981" 
            fillOpacity={0.6}
            name="Threats Blocked"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderSecurityViolations = () => (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Security Violations</h3>
        <div className="flex space-x-2">
          <Badge variant="error">{securityMetrics.criticalViolations} Critical</Badge>
          <Badge variant="warning">{securityMetrics.openViolations} Open</Badge>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {securityViolations.map((violation) => (
          <div
            key={violation.id}
            className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleIncidentClick(violation)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge 
                    variant={
                      violation.severity === 'critical' ? 'error' :
                      violation.severity === 'high' ? 'warning' :
                      violation.severity === 'medium' ? 'info' : 'secondary'
                    }
                  >
                    {violation.severity.toUpperCase()}
                  </Badge>
                  <Badge 
                    variant={
                      violation.status === 'open' ? 'error' :
                      violation.status === 'investigating' ? 'warning' : 'success'
                    }
                  >
                    {violation.status.toUpperCase()}
                  </Badge>
                </div>
                <h4 className="font-medium text-gray-900">{violation.type}</h4>
                <p className="text-sm text-gray-600 mt-1">{violation.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>User: {violation.user || 'Unknown'}</span>
                  <span>IP: {violation.ipAddress}</span>
                  <span>Risk: {violation.riskScore}/100</span>
                  <span>{new Date(violation.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className="ml-4">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[violation.severity] }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderComplianceStatus = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {complianceStatus.map((framework) => (
          <div key={framework.framework} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{framework.framework}</h4>
              <Badge variant={
                framework.status === 'compliant' ? 'success' :
                framework.status === 'partial' ? 'warning' : 'error'
              }>
                {framework.score}%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Controls:</span>
                <span>{framework.controls}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <span className={`capitalize ${
                  framework.status === 'compliant' ? 'text-green-600' :
                  framework.status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {framework.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Next Assessment:</span>
                <span>{new Date(framework.nextAssessment).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    framework.status === 'compliant' ? 'bg-green-500' :
                    framework.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${framework.score}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderSecurityPolicies = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Security Policies</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Policy Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Enforcement</th>
              <th className="px-4 py-2 text-left">Violations</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {securityPolicies.map((policy) => (
              <tr key={policy.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{policy.name}</td>
                <td className="px-4 py-2">{policy.type}</td>
                <td className="px-4 py-2">
                  <Badge variant={
                    policy.enforcement === 'Strict' ? 'error' :
                    policy.enforcement === 'Moderate' ? 'warning' : 'info'
                  }>
                    {policy.enforcement}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  {policy.violations > 0 ? (
                    <Badge variant="warning">{policy.violations}</Badge>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={policy.active ? 'success' : 'secondary'}>
                    {policy.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-2">{new Date(policy.lastUpdated).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderDeviceTrust = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Device Trust Management</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deviceTrust.map((device) => (
          <div key={device.deviceId} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium truncate">{device.deviceName}</h4>
              <Badge variant={
                device.trustLevel === 'trusted' ? 'success' :
                device.trustLevel === 'limited' ? 'warning' :
                device.trustLevel === 'blocked' ? 'error' : 'secondary'
              }>
                {device.trustLevel}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="capitalize">{device.deviceType}</span>
              </div>
              <div className="flex justify-between">
                <span>User:</span>
                <span className="truncate">{device.user}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Seen:</span>
                <span>{new Date(device.lastSeen).toLocaleDateString()}</span>
              </div>
            </div>
            {device.riskFactors.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Risk Factors:</div>
                <div className="flex flex-wrap gap-1">
                  {device.riskFactors.map((factor, index) => (
                    <Badge key={index} variant="secondary" size="sm">
                      {factor.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );

  const renderIncidentResponseModal = () => (
    <Modal
      isOpen={showIncidentModal}
      onClose={() => setShowIncidentModal(false)}
      title="Security Incident Response"
    >
      {selectedIncident && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-lg mb-2">{selectedIncident.type}</h4>
            <p className="text-gray-700 mb-3">{selectedIncident.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Severity:</span>
                <Badge 
                  className="ml-2"
                  variant={
                    selectedIncident.severity === 'critical' ? 'error' :
                    selectedIncident.severity === 'high' ? 'warning' :
                    selectedIncident.severity === 'medium' ? 'info' : 'secondary'
                  }
                >
                  {selectedIncident.severity.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Risk Score:</span>
                <span className="ml-2">{selectedIncident.riskScore}/100</span>
              </div>
              <div>
                <span className="font-medium">User:</span>
                <span className="ml-2">{selectedIncident.user || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium">IP Address:</span>
                <span className="ml-2">{selectedIncident.ipAddress}</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <Badge 
                  className="ml-2"
                  variant={
                    selectedIncident.status === 'open' ? 'error' :
                    selectedIncident.status === 'investigating' ? 'warning' : 'success'
                  }
                >
                  {selectedIncident.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Detected:</span>
                <span className="ml-2">{new Date(selectedIncident.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-medium">Response Actions:</h5>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleIncidentResponse('investigate')}
                variant="secondary"
                disabled={selectedIncident.status === 'investigating'}
              >
                Start Investigation
              </Button>
              <Button
                onClick={() => handleIncidentResponse('resolve')}
                variant="primary"
                disabled={selectedIncident.status === 'resolved'}
              >
                Mark Resolved
              </Button>
              <Button
                onClick={() => handleIncidentResponse('escalate')}
                variant="warning"
              >
                Escalate
              </Button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <h6 className="font-medium text-blue-900 mb-1">Recommended Actions:</h6>
            <ul className="text-sm text-blue-800 space-y-1">
              {selectedIncident.severity === 'critical' && (
                <>
                  <li>• Immediately block source IP address</li>
                  <li>• Notify security team and management</li>
                  <li>• Review user account permissions</li>
                </>
              )}
              {selectedIncident.type.includes('Login') && (
                <>
                  <li>• Force password reset for affected user</li>
                  <li>• Enable additional MFA requirements</li>
                </>
              )}
              {selectedIncident.type.includes('Device') && (
                <>
                  <li>• Require device re-registration</li>
                  <li>• Update device trust policies</li>
                </>
              )}
              <li>• Document incident details for audit trail</li>
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: '1h', label: 'Last Hour' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' }
            ]}
          />
          <Button onClick={loadSecurityData} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Violations</p>
              <p className="text-2xl font-bold text-gray-900">{securityMetrics.totalViolations}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{securityMetrics.openViolations}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{securityMetrics.criticalViolations}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900">{securityMetrics.avgRiskScore}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="threats">
        <Tabs.List>
          <Tabs.Trigger value="threats">Threat Detection</Tabs.Trigger>
          <Tabs.Trigger value="incidents">Security Incidents</Tabs.Trigger>
          <Tabs.Trigger value="compliance">Compliance Status</Tabs.Trigger>
          <Tabs.Trigger value="policies">Security Policies</Tabs.Trigger>
          <Tabs.Trigger value="devices">Device Trust</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="threats">
          <div className="space-y-6">
            {renderThreatVisualization()}
          </div>
        </Tabs.Content>

        <Tabs.Content value="incidents">
          <div className="space-y-6">
            {renderSecurityViolations()}
          </div>
        </Tabs.Content>

        <Tabs.Content value="compliance">
          <div className="space-y-6">
            {renderComplianceStatus()}
          </div>
        </Tabs.Content>

        <Tabs.Content value="policies">
          <div className="space-y-6">
            {renderSecurityPolicies()}
          </div>
        </Tabs.Content>

        <Tabs.Content value="devices">
          <div className="space-y-6">
            {renderDeviceTrust()}
          </div>
        </Tabs.Content>
      </Tabs>

      {/* Incident Response Modal */}
      {renderIncidentResponseModal()}
    </div>
  );
};

export default SecurityDashboardEnhancement; 