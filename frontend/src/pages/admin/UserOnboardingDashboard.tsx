import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/common/Tabs/Tabs';

interface OnboardingStep {
  step_id: string;
  step_name: string;
  description: string;
  step_order: number;
  is_required: boolean;
  estimated_time: number;
  completion_rate: number;
}

interface HelpArticle {
  article_id: string;
  title: string;
  category: string;
  difficulty_level: string;
  estimated_read_time: number;
  views: number;
  helpful_votes: number;
}

interface UserFeedback {
  feedback_id: string;
  feedback_type: string;
  rating: number;
  comment: string;
  feature_area: string;
  submitted_at: string;
}

interface OnboardingMetrics {
  onboarding_overview: {
    total_steps: number;
    required_steps: number;
    optional_steps: number;
    avg_completion_rate: number;
    total_estimated_time: number;
  };
  completion_rates: {
    required_steps_avg: number;
    optional_steps_avg: number;
  };
  bottlenecks: Array<{
    step_name: string;
    completion_rate: number;
    is_required: boolean;
  }>;
  feedback_summary: Array<{
    type: string;
    count: number;
    avg_rating: number;
  }>;
  recommendations: string[];
}

const UserOnboardingDashboard: React.FC = () => {
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [metrics, setMetrics] = useState<OnboardingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls - in real implementation, these would be actual API endpoints
      const mockOnboardingSteps: OnboardingStep[] = [
        {
          step_id: 'welcome_introduction',
          step_name: 'Welcome to SecureNet',
          description: 'Introduction to SecureNet platform and key features',
          step_order: 1,
          is_required: true,
          estimated_time: 2,
          completion_rate: 98.5
        },
        {
          step_id: 'profile_setup',
          step_name: 'Complete Your Profile',
          description: 'Set up your user profile and preferences',
          step_order: 2,
          is_required: true,
          estimated_time: 3,
          completion_rate: 95.2
        },
        {
          step_id: 'organization_config',
          step_name: 'Configure Organization Settings',
          description: 'Set up your organization details and basic security policies',
          step_order: 3,
          is_required: true,
          estimated_time: 5,
          completion_rate: 89.7
        },
        {
          step_id: 'dashboard_tour',
          step_name: 'Dashboard Tour',
          description: 'Interactive tour of the main dashboard and key features',
          step_order: 5,
          is_required: false,
          estimated_time: 6,
          completion_rate: 76.8
        }
      ];

      const mockHelpArticles: HelpArticle[] = [
        {
          article_id: 'getting_started_overview',
          title: 'Getting Started with SecureNet',
          category: 'getting_started',
          difficulty_level: 'beginner',
          estimated_read_time: 3,
          views: 1247,
          helpful_votes: 89
        },
        {
          article_id: 'dashboard_navigation',
          title: 'Navigating Your Security Dashboard',
          category: 'navigation',
          difficulty_level: 'beginner',
          estimated_read_time: 4,
          views: 856,
          helpful_votes: 67
        }
      ];

      const mockUserFeedback: UserFeedback[] = [
        {
          feedback_id: 'fb_001',
          feedback_type: 'feature_request',
          rating: 4,
          comment: 'Would love to see more customization options for the dashboard widgets',
          feature_area: 'dashboard',
          submitted_at: '2024-01-15T10:30:00Z'
        },
        {
          feedback_id: 'fb_002',
          feedback_type: 'usability',
          rating: 4,
          comment: 'The onboarding process was smooth, but could use more interactive tutorials',
          feature_area: 'onboarding',
          submitted_at: '2024-01-15T11:45:00Z'
        }
      ];

      const mockMetrics: OnboardingMetrics = {
        onboarding_overview: {
          total_steps: 11,
          required_steps: 7,
          optional_steps: 4,
          avg_completion_rate: 85.3,
          total_estimated_time: 58
        },
        completion_rates: {
          required_steps_avg: 89.2,
          optional_steps_avg: 69.3
        },
        bottlenecks: [
          {
            step_name: 'Compliance Setup',
            completion_rate: 58.2,
            is_required: false
          },
          {
            step_name: 'Team Invitation',
            completion_rate: 67.3,
            is_required: false
          }
        ],
        feedback_summary: [
          { type: 'general_feedback', count: 12, avg_rating: 4.2 },
          { type: 'feature_request', count: 8, avg_rating: 4.1 },
          { type: 'usability', count: 6, avg_rating: 3.8 }
        ],
        recommendations: [
          'Focus on improving optional steps with low completion rates',
          'Consider making compliance setup more user-friendly',
          'Add more interactive elements to team invitation flow'
        ]
      };

      setOnboardingSteps(mockOnboardingSteps);
      setHelpArticles(mockHelpArticles);
      setUserFeedback(mockUserFeedback);
      setMetrics(mockMetrics);
      
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDifficultyBadgeVariant = (level: string) => {
    switch (level) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading onboarding dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Onboarding Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and optimize user onboarding experience</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Export Report</Button>
          <Button>Optimize Flow</Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.onboarding_overview.total_steps}</div>
              <p className="text-xs text-gray-600">
                {metrics.onboarding_overview.required_steps} required, {metrics.onboarding_overview.optional_steps} optional
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.onboarding_overview.avg_completion_rate}%</div>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${getCompletionRateColor(metrics.onboarding_overview.avg_completion_rate)}`}></div>
                <p className="text-xs text-gray-600">Across all steps</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estimated Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.onboarding_overview.total_estimated_time}min</div>
              <p className="text-xs text-gray-600">Total onboarding time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bottlenecks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.bottlenecks.length}</div>
              <p className="text-xs text-gray-600">Steps needing attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="steps">Onboarding Steps</TabsTrigger>
          <TabsTrigger value="help">Help System</TabsTrigger>
          <TabsTrigger value="feedback">User Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rates by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Required Steps</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${metrics.completion_rates.required_steps_avg}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{metrics.completion_rates.required_steps_avg}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Optional Steps</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${metrics.completion_rates.optional_steps_avg}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{metrics.completion_rates.optional_steps_avg}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottlenecks */}
            <Card>
              <CardHeader>
                <CardTitle>Identified Bottlenecks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{bottleneck.step_name}</p>
                        <p className="text-xs text-gray-600">
                          {bottleneck.is_required ? 'Required' : 'Optional'} step
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {bottleneck.completion_rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {metrics && metrics.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {metrics.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Steps Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingSteps.map((step) => (
                  <div key={step.step_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{step.step_name}</h3>
                        <Badge variant={step.is_required ? "default" : "secondary"}>
                          {step.is_required ? 'Required' : 'Optional'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Estimated time: {step.estimated_time} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{step.completion_rate}%</div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getCompletionRateColor(step.completion_rate)}`}
                          style={{ width: `${step.completion_rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Help System Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {helpArticles.map((article) => (
                  <div key={article.article_id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{article.title}</h3>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={getDifficultyBadgeVariant(article.difficulty_level)}>
                            {article.difficulty_level}
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {article.estimated_read_time} min read
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                      <span>{article.views} views</span>
                      <span>{article.helpful_votes} helpful votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userFeedback.map((feedback) => (
                  <div key={feedback.feedback_id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{feedback.feedback_type}</Badge>
                          <Badge variant="secondary">{feedback.feature_area}</Badge>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${i < feedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm mt-2">{feedback.comment}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(feedback.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserOnboardingDashboard; 