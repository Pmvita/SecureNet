import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/common/Tabs';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Rocket, Shield, CheckCircle, AlertTriangle, Clock, Settings,
  Database, Monitor, Lock, FileCheck, TrendingUp, Activity,
  RefreshCw, Download, Play, Pause, AlertCircle
} from 'lucide-react';

// Interfaces for production launch data
interface LaunchReadinessCheck {
  checkId: string;
  category: string;
  checkName: string;
  status: string;
  score: number;
  maxScore: number;
  details: string;
  recommendations: string[];
  critical: boolean;
}

interface SecurityAuditResult {
  auditId: string;
  auditType: string;
  component: string;
  severity: string;
  finding: string;
  status: string;
  remediation: string;
  complianceImpact: string[];
}

interface DeploymentChecklistItem {
  itemId: string;
  category: string;
  itemName: string;
  description: string;
  status: string;
  assignedTeam: string;
  priority: string;
  completedAt?: string;
  verifiedBy?: string;
}

interface LaunchReadinessReport {
  reportGenerated: string;
  launchReadinessSummary: {
    overallScore: number;
    maxScore: number;
    percentage: number;
    status: string;
    criticalItemsPassed: string;
    totalAssessments: number;
  };
  securityAuditSummary: {
    totalAudits: number;
    passedAudits: number;
    securityScore: number;
    complianceFrameworks: string[];
  };
  deploymentReadiness: {
    checklistItems: number;
    completedItems: number;
    completionPercentage: number;
    configurationsValidated: number;
    backupValidations: number;
  };
  categoryBreakdown: {
    [key: string]: {
      assessments: number;
      averageScore: number;
    };
  };
  launchRecommendation: string;
}

const ProductionLaunchDashboard: React.FC = () => {
  // State management
  const [readinessChecks, setReadinessChecks] = useState<LaunchReadinessCheck[]>([]);
  const [securityAudits, setSecurityAudits] = useState<SecurityAuditResult[]>([]);
  const [deploymentChecklist, setDeploymentChecklist] = useState<DeploymentChecklistItem[]>([]);
  const [launchReport, setLaunchReport] = useState<LaunchReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const mockReadinessChecks: LaunchReadinessCheck[] = [
    {
      checkId: 'ui_accessibility_compliance',
      category: 'frontend',
      checkName: 'UI Accessibility Compliance',
      status: 'completed',
      score: 95,
      maxScore: 100,
      details: 'WCAG 2.1 AA compliance validation with automated testing',
      recommendations: ['Excellent readiness - ready for production'],
      critical: true
    },
    {
      checkId: 'security_hardening',
      category: 'backend',
      checkName: 'Production Security Hardening',
      status: 'completed',
      score: 98,
      maxScore: 100,
      details: 'Security configuration validation with penetration testing',
      recommendations: ['Excellent readiness - ready for production'],
      critical: true
    },
    {
      checkId: 'deployment_pipeline',
      category: 'devops',
      checkName: 'Deployment Pipeline Optimization',
      status: 'completed',
      score: 100,
      maxScore: 100,
      details: 'CI/CD pipeline validation with automated rollback procedures',
      recommendations: ['Excellent readiness - ready for production'],
      critical: true
    },
    {
      checkId: 'security_audit',
      category: 'security',
      checkName: 'Comprehensive Security Audit',
      status: 'completed',
      score: 96,
      maxScore: 100,
      details: 'Multi-layer security assessment with vulnerability scanning',
      recommendations: ['Excellent readiness - ready for production'],
      critical: true
    }
  ];

  const mockSecurityAudits: SecurityAuditResult[] = [
    {
      auditId: 'auth_security_audit',
      auditType: 'authentication',
      component: 'JWT Authentication System',
      severity: 'high',
      finding: 'JWT token security validation with proper expiration and refresh mechanisms',
      status: 'passed',
      remediation: 'JWT security implementation validated with proper token lifecycle management',
      complianceImpact: ['SOC2', 'ISO27001']
    },
    {
      auditId: 'database_security_audit',
      auditType: 'data_security',
      component: 'Database Security',
      severity: 'high',
      finding: 'Database encryption and access control validation',
      status: 'passed',
      remediation: 'Database properly secured with encryption at rest and proper access controls',
      complianceImpact: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA']
    }
  ];

  const mockDeploymentChecklist: DeploymentChecklistItem[] = [
    {
      itemId: 'ui_accessibility_final',
      category: 'frontend',
      itemName: 'Final UI Accessibility Validation',
      description: 'Complete WCAG 2.1 AA compliance testing with automated and manual validation',
      status: 'completed',
      assignedTeam: 'frontend',
      priority: 'critical',
      completedAt: new Date().toISOString(),
      verifiedBy: 'UI/UX Lead'
    },
    {
      itemId: 'security_hardening_final',
      category: 'backend',
      itemName: 'Production Security Hardening Final',
      description: 'Complete security configuration validation with penetration testing',
      status: 'completed',
      assignedTeam: 'backend',
      priority: 'critical',
      completedAt: new Date().toISOString(),
      verifiedBy: 'Security Engineer'
    }
  ];

  const mockLaunchReport: LaunchReadinessReport = {
    reportGenerated: new Date().toISOString(),
    launchReadinessSummary: {
      overallScore: 1547,
      maxScore: 1600,
      percentage: 96.7,
      status: 'READY FOR LAUNCH',
      criticalItemsPassed: '16/16',
      totalAssessments: 16
    },
    securityAuditSummary: {
      totalAudits: 10,
      passedAudits: 10,
      securityScore: 100.0,
      complianceFrameworks: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'FedRAMP']
    },
    deploymentReadiness: {
      checklistItems: 12,
      completedItems: 12,
      completionPercentage: 100.0,
      configurationsValidated: 6,
      backupValidations: 5
    },
    categoryBreakdown: {
      frontend: { assessments: 4, averageScore: 95.0 },
      backend: { assessments: 4, averageScore: 96.3 },
      devops: { assessments: 4, averageScore: 93.8 },
      security: { assessments: 4, averageScore: 97.5 }
    },
    launchRecommendation: 'APPROVED FOR PRODUCTION LAUNCH'
  };

  // Data loading simulation
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setReadinessChecks(mockReadinessChecks);
      setSecurityAudits(mockSecurityAudits);
      setDeploymentChecklist(mockDeploymentChecklist);
      setLaunchReport(mockLaunchReport);
      setLoading(false);
    };

    loadData();
  }, []);

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Chart data preparation
  const categoryScoreData = launchReport ? Object.entries(launchReport.categoryBreakdown).map(([category, data]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    score: data.averageScore,
    assessments: data.assessments
  })) : [];

  const readinessOverviewData = launchReport ? [
    { name: 'Completed', value: launchReport.launchReadinessSummary.overallScore, color: '#10B981' },
    { name: 'Remaining', value: launchReport.launchReadinessSummary.maxScore - launchReport.launchReadinessSummary.overallScore, color: '#E5E7EB' }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Loading production launch dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Rocket className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Launch Dashboard</h1>
            <p className="text-gray-600">Final launch readiness assessment and deployment validation</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          {launchReport?.launchRecommendation === 'APPROVED FOR PRODUCTION LAUNCH' && (
            <Button className="bg-green-600 hover:bg-green-700" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Launch Production
            </Button>
          )}
        </div>
      </div>

      {/* Launch Status Alert */}
      {launchReport && (
        <Alert className={
          launchReport.launchRecommendation === 'APPROVED FOR PRODUCTION LAUNCH' 
            ? 'border-green-200 bg-green-50' 
            : 'border-yellow-200 bg-yellow-50'
        }>
          <div className="flex items-center">
            {launchReport.launchRecommendation === 'APPROVED FOR PRODUCTION LAUNCH' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            )}
            <div>
              <h3 className="font-semibold">
                {launchReport.launchRecommendation}
              </h3>
              <p className="text-sm mt-1">
                Overall readiness: {launchReport.launchReadinessSummary.percentage}% 
                ({launchReport.launchReadinessSummary.overallScore}/{launchReport.launchReadinessSummary.maxScore} points)
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Launch Readiness</p>
                <p className="text-3xl font-bold text-gray-900">
                  {launchReport?.launchReadinessSummary.percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-green-600">
                  {launchReport?.launchReadinessSummary.status}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-3xl font-bold text-gray-900">
                  {launchReport?.securityAuditSummary.securityScore.toFixed(1)}%
                </p>
                <p className="text-sm text-green-600">All audits passed</p>
              </div>
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Checklist Complete</p>
                <p className="text-3xl font-bold text-gray-900">
                  {launchReport?.deploymentReadiness.completionPercentage.toFixed(0)}%
                </p>
                <p className="text-sm text-green-600">
                  {launchReport?.deploymentReadiness.completedItems}/{launchReport?.deploymentReadiness.checklistItems} items
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Items</p>
                <p className="text-3xl font-bold text-gray-900">
                  {launchReport?.launchReadinessSummary.criticalItemsPassed}
                </p>
                <p className="text-sm text-green-600">All critical passed</p>
              </div>
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Launch Overview</TabsTrigger>
          <TabsTrigger value="readiness">Readiness Checks</TabsTrigger>
          <TabsTrigger value="security">Security Audit</TabsTrigger>
          <TabsTrigger value="checklist">Deployment Checklist</TabsTrigger>
        </TabsList>

        {/* Launch Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Readiness Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Overall Launch Readiness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={readinessOverviewData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {readinessOverviewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-4">
                  <p className="text-2xl font-bold text-green-600">
                    {launchReport?.launchReadinessSummary.percentage.toFixed(1)}%
                  </p>
                  <p className="text-gray-600">Ready for Launch</p>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Category Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Launch Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Production Launch Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800">Week 5 Day 5 - Final Preparation Complete</h4>
                      <p className="text-sm text-green-600">All launch readiness assessments completed successfully</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Play className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-800">Production Launch - Ready to Deploy</h4>
                      <p className="text-sm text-blue-600">System approved for production deployment</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">READY</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Readiness Checks Tab */}
        <TabsContent value="readiness" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {readinessChecks.map((check) => (
              <Card key={check.checkId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{check.checkName}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      {check.critical && (
                        <Badge className="bg-red-100 text-red-800">CRITICAL</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Score:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {check.score}/{check.maxScore} ({Math.round(check.score / check.maxScore * 100)}%)
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(check.score / check.maxScore) * 100}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-sm text-gray-600">{check.details}</p>
                    
                    {check.recommendations.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {check.recommendations.slice(0, 2).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Security Audit Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {securityAudits.map((audit) => (
              <Card key={audit.auditId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{audit.component}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(audit.status)}>
                        {audit.status}
                      </Badge>
                      <Badge className={getSeverityColor(audit.severity)}>
                        {audit.severity}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Audit Type:</p>
                      <p className="text-sm text-gray-600 capitalize">{audit.auditType.replace('_', ' ')}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Finding:</p>
                      <p className="text-sm text-gray-600">{audit.finding}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Remediation:</p>
                      <p className="text-sm text-gray-600">{audit.remediation}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Compliance Impact:</p>
                      <div className="flex flex-wrap gap-1">
                        {audit.complianceImpact.map((framework, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {framework}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Deployment Checklist Tab */}
        <TabsContent value="checklist" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {deploymentChecklist.map((item) => (
              <Card key={item.itemId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold text-gray-900">{item.itemName}</h4>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Team: {item.assignedTeam}</span>
                        {item.verifiedBy && <span>Verified by: {item.verifiedBy}</span>}
                        {item.completedAt && (
                          <span>Completed: {new Date(item.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionLaunchDashboard; 