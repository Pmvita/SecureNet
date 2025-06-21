import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/common/Tabs';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Brain, Target, Users, Shield, TrendingUp, AlertTriangle, 
  Activity, Database, Cpu, Network, Eye, Settings,
  ChevronRight, RefreshCw, Download, Filter, Search
} from 'lucide-react';

// Interfaces for advanced analytics data
interface ThreatPrediction {
  id: string;
  threatType: string;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedAt: string;
  factors: Record<string, boolean>;
  mitigationRecommendations: string[];
}

interface UserBehaviorProfile {
  userId: number;
  username: string;
  anomalyScore: number;
  riskFactors: string[];
  behaviorPatterns: {
    loginFrequency: { dailyAverage: number; weeklyPattern: number[] };
    accessPatterns: { sessionDurationAvg: number; concurrentSessions: number };
    locationPatterns: { primaryLocations: string[]; vpnUsage: boolean };
    devicePatterns: { primaryDevices: string[]; osPreferences: string };
  };
  lastUpdated: string;
}

interface RiskScore {
  entityId: string;
  entityType: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  scoringFactors: string[];
  confidenceLevel: number;
  calculatedAt: string;
}

interface CompliancePrediction {
  framework: string;
  controlId: string;
  currentScore: number;
  predictedScore: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  confidence: number;
  riskFactors: string[];
  recommendedActions: string[];
}

interface MLModelPerformance {
  modelName: string;
  modelVersion: string;
  modelType: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrained: string;
  status: 'active' | 'training' | 'deprecated';
}

interface AnalyticsInsight {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  confidenceScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dataPoints: Record<string, any>;
  generatedAt: string;
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  // State management
  const [threatPredictions, setThreatPredictions] = useState<ThreatPrediction[]>([]);
  const [userBehaviorProfiles, setUserBehaviorProfiles] = useState<UserBehaviorProfile[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [compliancePredictions, setCompliancePredictions] = useState<CompliancePrediction[]>([]);
  const [mlModelPerformance, setMLModelPerformance] = useState<MLModelPerformance[]>([]);
  const [analyticsInsights, setAnalyticsInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<AnalyticsInsight | null>(null);
  const [activeTab, setActiveTab] = useState('threats');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Mock data for demonstration
  const mockThreatPredictions: ThreatPrediction[] = [
    {
      id: 'pred_001',
      threatType: 'brute_force_attack',
      confidenceScore: 0.892,
      riskLevel: 'high',
      predictedAt: new Date().toISOString(),
      factors: { historicalPatterns: true, externalIntelligence: true, userBehaviorAnomalies: false },
      mitigationRecommendations: ['Implement account lockout policies', 'Enable multi-factor authentication']
    },
    {
      id: 'pred_002',
      threatType: 'privilege_escalation',
      confidenceScore: 0.756,
      riskLevel: 'medium',
      predictedAt: new Date().toISOString(),
      factors: { historicalPatterns: false, externalIntelligence: true, userBehaviorAnomalies: true },
      mitigationRecommendations: ['Review user permissions', 'Implement least privilege principle']
    },
    {
      id: 'pred_003',
      threatType: 'data_exfiltration',
      confidenceScore: 0.934,
      riskLevel: 'critical',
      predictedAt: new Date().toISOString(),
      factors: { historicalPatterns: true, externalIntelligence: true, userBehaviorAnomalies: true },
      mitigationRecommendations: ['Implement data loss prevention', 'Monitor large data transfers']
    }
  ];

  const mockUserBehaviorProfiles: UserBehaviorProfile[] = [
    {
      userId: 1,
      username: 'admin',
      anomalyScore: 23.5,
      riskFactors: ['unusual_login_times'],
      behaviorPatterns: {
        loginFrequency: { dailyAverage: 4, weeklyPattern: [3, 4, 5, 4, 3, 2, 1] },
        accessPatterns: { sessionDurationAvg: 120, concurrentSessions: 2 },
        locationPatterns: { primaryLocations: ['Office', 'Home'], vpnUsage: true },
        devicePatterns: { primaryDevices: ['laptop_001', 'mobile_002'], osPreferences: 'Windows' }
      },
      lastUpdated: new Date().toISOString()
    },
    {
      userId: 2,
      username: 'user',
      anomalyScore: 67.8,
      riskFactors: ['location_anomaly', 'new_device_access'],
      behaviorPatterns: {
        loginFrequency: { dailyAverage: 6, weeklyPattern: [5, 6, 7, 6, 5, 3, 2] },
        accessPatterns: { sessionDurationAvg: 90, concurrentSessions: 1 },
        locationPatterns: { primaryLocations: ['Office'], vpnUsage: false },
        devicePatterns: { primaryDevices: ['laptop_003'], osPreferences: 'macOS' }
      },
      lastUpdated: new Date().toISOString()
    }
  ];

  const mockAnalyticsInsights: AnalyticsInsight[] = [
    {
      id: 'insight_001',
      type: 'security_trend',
      category: 'threat_analysis',
      title: 'Increasing Brute Force Attack Attempts',
      description: 'Analysis shows 35% increase in brute force attacks over the past 7 days.',
      confidenceScore: 0.92,
      priority: 'high',
      dataPoints: { attackIncrease: '35%', timeframe: '7 days' },
      generatedAt: new Date().toISOString()
    },
    {
      id: 'insight_002',
      type: 'compliance_prediction',
      category: 'regulatory',
      title: 'SOC2 Compliance Score Declining',
      description: 'Predictive models indicate SOC2 compliance score may drop below 85%.',
      confidenceScore: 0.87,
      priority: 'critical',
      dataPoints: { currentScore: '89%', predictedScore: '82%' },
      generatedAt: new Date().toISOString()
    }
  ];

  // Data loading simulation
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setThreatPredictions(mockThreatPredictions);
      setUserBehaviorProfiles(mockUserBehaviorProfiles);
      setAnalyticsInsights(mockAnalyticsInsights);
      
      // Mock additional data
      setRiskScores([
        { entityId: 'user_1', entityType: 'user', riskScore: 75, riskLevel: 'high', 
          scoringFactors: ['high_privilege_access'], confidenceLevel: 0.89, 
          calculatedAt: new Date().toISOString() }
      ]);
      
      setCompliancePredictions([
        { framework: 'SOC2', controlId: 'CC1.1', currentScore: 89, predictedScore: 82,
          trendDirection: 'declining', confidence: 0.87, riskFactors: ['staff_turnover'],
          recommendedActions: ['Schedule compliance training'] }
      ]);
      
      setMLModelPerformance([
        { modelName: 'threat_prediction_ensemble', modelVersion: 'v2.1', modelType: 'ensemble',
          accuracy: 0.892, precision: 0.885, recall: 0.898, f1Score: 0.891,
          lastTrained: new Date().toISOString(), status: 'active' }
      ]);
      
      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time updates
      setThreatPredictions(prev => prev.map(prediction => ({
        ...prediction,
        confidenceScore: Math.max(0.5, Math.min(1.0, prediction.confidenceScore + (Math.random() - 0.5) * 0.1))
      })));
    }, 30000); // Update every 30 seconds

    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, []);

  // Utility functions
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatConfidenceScore = (score: number) => `${Math.round(score * 100)}%`;

  // Chart data preparation
  const threatTrendData = [
    { name: 'Mon', brute_force: 12, privilege_escalation: 8, data_exfiltration: 3 },
    { name: 'Tue', brute_force: 15, privilege_escalation: 6, data_exfiltration: 5 },
    { name: 'Wed', brute_force: 18, privilege_escalation: 9, data_exfiltration: 4 },
    { name: 'Thu', brute_force: 22, privilege_escalation: 12, data_exfiltration: 7 },
    { name: 'Fri', brute_force: 28, privilege_escalation: 15, data_exfiltration: 9 },
    { name: 'Sat', brute_force: 20, privilege_escalation: 10, data_exfiltration: 6 },
    { name: 'Sun', brute_force: 16, privilege_escalation: 7, data_exfiltration: 4 }
  ];

  const riskDistributionData = [
    { name: 'Low', value: 45, color: '#10B981' },
    { name: 'Medium', value: 30, color: '#F59E0B' },
    { name: 'High', value: 20, color: '#EF4444' },
    { name: 'Critical', value: 5, color: '#DC2626' }
  ];

  const complianceScoreData = [
    { framework: 'SOC2', current: 89, predicted: 82 },
    { framework: 'ISO27001', current: 92, predicted: 94 },
    { framework: 'GDPR', current: 87, predicted: 85 },
    { framework: 'HIPAA', current: 95, predicted: 93 },
    { framework: 'FedRAMP', current: 78, predicted: 81 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Loading advanced analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics & AI/ML Dashboard</h1>
            <p className="text-gray-600">Real-time threat prediction, behavior analytics, and compliance monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Threat Predictions</p>
                <p className="text-3xl font-bold text-gray-900">{threatPredictions.length}</p>
                <p className="text-sm text-green-600">↑ 23% from last week</p>
              </div>
              <Target className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Behavior Profiles</p>
                <p className="text-3xl font-bold text-gray-900">{userBehaviorProfiles.length}</p>
                <p className="text-sm text-blue-600">100% baseline established</p>
              </div>
              <Users className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ML Model Accuracy</p>
                <p className="text-3xl font-bold text-gray-900">89.2%</p>
                <p className="text-sm text-green-600">↑ 2.1% improved</p>
              </div>
              <Brain className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Insights</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analyticsInsights.filter(i => i.priority === 'critical').length}
                </p>
                <p className="text-sm text-red-600">Requires attention</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="threats">Threat Predictions</TabsTrigger>
          <TabsTrigger value="behavior">User Behavior</TabsTrigger>
          <TabsTrigger value="risk">Risk Scoring</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Threat Predictions Tab */}
        <TabsContent value="threats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Threat Prediction Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={threatTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="brute_force" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="privilege_escalation" stroke="#F59E0B" strokeWidth={2} />
                    <Line type="monotone" dataKey="data_exfiltration" stroke="#DC2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Active Predictions */}
            <Card>
              <CardHeader>
                <CardTitle>Active Threat Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threatPredictions.map((prediction) => (
                    <div key={prediction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold capitalize">
                          {prediction.threatType.replace('_', ' ')}
                        </h4>
                        <Badge className={getRiskLevelColor(prediction.riskLevel)}>
                          {prediction.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Confidence: {formatConfidenceScore(prediction.confidenceScore)}
                      </p>
                      <div className="text-sm">
                        <p className="font-medium mb-1">Mitigation:</p>
                        <ul className="list-disc list-inside text-gray-600">
                          {prediction.mitigationRecommendations.slice(0, 2).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Anomaly Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  User Anomaly Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userBehaviorProfiles.map(profile => ({
                    username: profile.username,
                    anomalyScore: profile.anomalyScore,
                    riskFactors: profile.riskFactors.length
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="username" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="anomalyScore" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Behavior Profiles */}
            <Card>
              <CardHeader>
                <CardTitle>User Behavior Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userBehaviorProfiles.map((profile) => (
                    <div key={profile.userId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{profile.username}</h4>
                        <Badge className={profile.anomalyScore > 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          Anomaly: {profile.anomalyScore.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Daily Logins:</span> {profile.behaviorPatterns.loginFrequency.dailyAverage}</p>
                        <p><span className="font-medium">Avg Session:</span> {profile.behaviorPatterns.accessPatterns.sessionDurationAvg}min</p>
                        <p><span className="font-medium">Primary OS:</span> {profile.behaviorPatterns.devicePatterns.osPreferences}</p>
                        {profile.riskFactors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-red-600">Risk Factors:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.riskFactors.map((factor, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {factor.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Scoring Tab */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Risk Level Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Scores Table */}
            <Card>
              <CardHeader>
                <CardTitle>Entity Risk Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...riskScores, 
                    { entityId: 'device_001', entityType: 'device', riskScore: 65, riskLevel: 'medium' as const, 
                      scoringFactors: ['unmanaged_device'], confidenceLevel: 0.82, calculatedAt: new Date().toISOString() },
                    { entityId: 'network_dmz', entityType: 'network', riskScore: 85, riskLevel: 'high' as const,
                      scoringFactors: ['external_connections'], confidenceLevel: 0.78, calculatedAt: new Date().toISOString() }
                  ].map((score, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{score.entityId}</p>
                        <p className="text-sm text-gray-600 capitalize">{score.entityType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{score.riskScore}</p>
                        <Badge className={getRiskLevelColor(score.riskLevel)}>
                          {score.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Score Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Compliance Score Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complianceScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="framework" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#10B981" name="Current Score" />
                    <Bar dataKey="predicted" fill="#3B82F6" name="Predicted Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Compliance Predictions */}
            <Card>
              <CardHeader>
                <CardTitle>Framework Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {compliancePredictions.map((prediction, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{prediction.framework} - {prediction.controlId}</h4>
                        <Badge className={
                          prediction.trendDirection === 'improving' ? 'bg-green-100 text-green-800' :
                          prediction.trendDirection === 'declining' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {prediction.trendDirection}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><span className="font-medium">Current:</span> {prediction.currentScore}%</p>
                          <p><span className="font-medium">Predicted:</span> {prediction.predictedScore}%</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Confidence:</span> {formatConfidenceScore(prediction.confidence)}</p>
                          {prediction.riskFactors.length > 0 && (
                            <p><span className="font-medium">Risk Factors:</span> {prediction.riskFactors.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Insights List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    AI-Generated Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsInsights.map((insight) => (
                      <div 
                        key={insight.id} 
                        className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-lg">{insight.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRiskLevelColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-gray-600 mb-2">{insight.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 capitalize">{insight.category}</span>
                          <span className="text-blue-600">
                            Confidence: {formatConfidenceScore(insight.confidenceScore)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ML Model Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="h-5 w-5 mr-2" />
                  ML Model Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mlModelPerformance.map((model, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <h5 className="font-medium text-sm mb-2">{model.modelName}</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Accuracy:</span>
                          <span className="font-medium">{formatConfidenceScore(model.accuracy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precision:</span>
                          <span className="font-medium">{formatConfidenceScore(model.precision)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recall:</span>
                          <span className="font-medium">{formatConfidenceScore(model.recall)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>F1-Score:</span>
                          <span className="font-medium">{formatConfidenceScore(model.f1Score)}</span>
                        </div>
                      </div>
                      <Badge 
                        className={`mt-2 ${model.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {model.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <Modal 
          isOpen={!!selectedInsight} 
          onClose={() => setSelectedInsight(null)}
          title="AI Insight Details"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">{selectedInsight.title}</h3>
              <Badge className={getRiskLevelColor(selectedInsight.priority)}>
                {selectedInsight.priority} priority
              </Badge>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Description</h4>
              <p className="text-gray-600">{selectedInsight.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Data Points</h4>
              <div className="bg-gray-50 rounded p-3">
                <pre className="text-sm">{JSON.stringify(selectedInsight.dataPoints, null, 2)}</pre>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Generated: {new Date(selectedInsight.generatedAt).toLocaleString()}
              </span>
              <span className="text-sm text-blue-600">
                Confidence: {formatConfidenceScore(selectedInsight.confidenceScore)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdvancedAnalyticsDashboard; 