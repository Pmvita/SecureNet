import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  DocumentTextIcon,
  BookOpenIcon,
  CodeBracketIcon,
  AcademicCapIcon,
  CogIcon,
  UsersIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  documents: DocumentationItem[];
  category: 'platform' | 'api' | 'business' | 'compliance';
}

interface DocumentationItem {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'reference' | 'tutorial' | 'policy' | 'manual';
  last_updated: string;
  url: string;
  tags: string[];
  access_level: 'founder' | 'admin' | 'public';
}

const PlatformDocumentation: React.FC = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<DocumentationSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentation();
  }, []);

  const fetchDocumentation = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation would fetch from documentation API
      setSections([
        {
          id: 'platform',
          title: 'Platform Architecture',
          description: 'Technical documentation for SecureNet platform infrastructure',
          icon: CogIcon,
          category: 'platform',
          documents: [
            {
              id: 'platform_overview',
              title: 'Platform Overview & Architecture',
              description: 'High-level overview of SecureNet platform architecture and components',
              type: 'guide',
              last_updated: '2024-08-01',
              url: '/docs/platform/overview',
              tags: ['architecture', 'overview', 'infrastructure'],
              access_level: 'founder'
            },
            {
              id: 'deployment_guide',
              title: 'Enterprise Deployment Guide',
              description: 'Complete guide for deploying SecureNet in enterprise environments',
              type: 'manual',
              last_updated: '2024-07-28',
              url: '/docs/platform/deployment',
              tags: ['deployment', 'enterprise', 'installation'],
              access_level: 'founder'
            },
            {
              id: 'scaling_strategies',
              title: 'Scaling & Performance Optimization',
              description: 'Strategies for scaling SecureNet to handle enterprise workloads',
              type: 'guide',
              last_updated: '2024-07-25',
              url: '/docs/platform/scaling',
              tags: ['scaling', 'performance', 'optimization'],
              access_level: 'founder'
            }
          ]
        },
        {
          id: 'api',
          title: 'API Documentation',
          description: 'Complete API reference and integration guides',
          icon: CodeBracketIcon,
          category: 'api',
          documents: [
            {
              id: 'api_reference',
              title: 'API Reference Documentation',
              description: 'Complete reference for all SecureNet API endpoints',
              type: 'reference',
              last_updated: '2024-08-01',
              url: '/docs/api/reference',
              tags: ['api', 'reference', 'endpoints'],
              access_level: 'public'
            },
            {
              id: 'api_authentication',
              title: 'API Authentication & Security',
              description: 'Authentication methods and security best practices for API integration',
              type: 'guide',
              last_updated: '2024-07-30',
              url: '/docs/api/authentication',
              tags: ['api', 'authentication', 'security'],
              access_level: 'admin'
            },
            {
              id: 'webhook_guide',
              title: 'Webhooks Integration Guide',
              description: 'Guide for implementing webhooks and real-time notifications',
              type: 'tutorial',
              last_updated: '2024-07-26',
              url: '/docs/api/webhooks',
              tags: ['webhooks', 'integration', 'real-time'],
              access_level: 'admin'
            }
          ]
        },
        {
          id: 'business',
          title: 'Business Operations',
          description: 'Business processes, pricing, and customer management',
          icon: BanknotesIcon,
          category: 'business',
          documents: [
            {
              id: 'pricing_strategy',
              title: 'Pricing Strategy & Models',
              description: 'Complete pricing strategy, tier definitions, and billing models',
              type: 'policy',
              last_updated: '2024-07-20',
              url: '/docs/business/pricing',
              tags: ['pricing', 'billing', 'strategy'],
              access_level: 'founder'
            },
            {
              id: 'customer_onboarding',
              title: 'Customer Onboarding Process',
              description: 'Standard operating procedures for customer onboarding',
              type: 'manual',
              last_updated: '2024-07-22',
              url: '/docs/business/onboarding',
              tags: ['onboarding', 'customers', 'process'],
              access_level: 'admin'
            },
            {
              id: 'sales_playbook',
              title: 'Sales Team Playbook',
              description: 'Sales strategies, objection handling, and competitive positioning',
              type: 'manual',
              last_updated: '2024-07-18',
              url: '/docs/business/sales',
              tags: ['sales', 'strategy', 'competitive'],
              access_level: 'founder'
            }
          ]
        },
        {
          id: 'compliance',
          title: 'Compliance & Legal',
          description: 'Compliance frameworks, legal documents, and regulatory requirements',
          icon: ShieldCheckIcon,
          category: 'compliance',
          documents: [
            {
              id: 'soc2_documentation',
              title: 'SOC 2 Compliance Documentation',
              description: 'Complete SOC 2 Type II compliance documentation and audit reports',
              type: 'reference',
              last_updated: '2024-07-15',
              url: '/docs/compliance/soc2',
              tags: ['soc2', 'compliance', 'audit'],
              access_level: 'founder'
            },
            {
              id: 'gdpr_compliance',
              title: 'GDPR Compliance Guide',
              description: 'GDPR compliance procedures and data protection measures',
              type: 'guide',
              last_updated: '2024-07-10',
              url: '/docs/compliance/gdpr',
              tags: ['gdpr', 'privacy', 'data-protection'],
              access_level: 'founder'
            },
            {
              id: 'incident_response',
              title: 'Security Incident Response Plan',
              description: 'Procedures for handling security incidents and data breaches',
              type: 'manual',
              last_updated: '2024-07-12',
              url: '/docs/compliance/incident-response',
              tags: ['incident', 'security', 'response'],
              access_level: 'founder'
            }
          ]
        },
        {
          id: 'user_guides',
          title: 'User Guides & Training',
          description: 'End-user documentation and training materials',
          icon: AcademicCapIcon,
          category: 'platform',
          documents: [
            {
              id: 'admin_guide',
              title: 'Administrator User Guide',
              description: 'Complete guide for platform administrators',
              type: 'guide',
              last_updated: '2024-07-29',
              url: '/docs/users/admin-guide',
              tags: ['admin', 'user-guide', 'training'],
              access_level: 'admin'
            },
            {
              id: 'end_user_guide',
              title: 'End User Guide',
              description: 'User guide for security analysts and operators',
              type: 'guide',
              last_updated: '2024-07-27',
              url: '/docs/users/end-user-guide',
              tags: ['end-user', 'guide', 'training'],
              access_level: 'public'
            },
            {
              id: 'training_materials',
              title: 'Training Materials & Videos',
              description: 'Comprehensive training materials and video tutorials',
              type: 'tutorial',
              last_updated: '2024-07-24',
              url: '/docs/users/training',
              tags: ['training', 'videos', 'tutorials'],
              access_level: 'public'
            }
          ]
        }
      ]);
    } catch (error) {
      console.error('Error fetching documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSections = sections.filter(section => {
    if (selectedCategory !== 'all' && section.category !== selectedCategory) {
      return false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        section.title.toLowerCase().includes(searchLower) ||
        section.description.toLowerCase().includes(searchLower) ||
        section.documents.some(doc => 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.description.toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      );
    }
    
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpenIcon className="w-4 h-4" />;
      case 'reference': return <DocumentIcon className="w-4 h-4" />;
      case 'tutorial': return <AcademicCapIcon className="w-4 h-4" />;
      case 'policy': return <ShieldCheckIcon className="w-4 h-4" />;
      case 'manual': return <CogIcon className="w-4 h-4" />;
      default: return <DocumentIcon className="w-4 h-4" />;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'founder': return 'text-purple-400 bg-purple-400/10';
      case 'admin': return 'text-blue-400 bg-blue-400/10';
      case 'public': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading documentation...</p>
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
            <DocumentTextIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Platform Documentation</h1>
          </div>
          <p className="text-gray-400 mb-4">
            Comprehensive documentation for SecureNet platform architecture, APIs, and business operations
          </p>
          <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              👑 <strong>Founder Access:</strong> Complete access to all documentation including confidential business and technical materials.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="platform">Platform</option>
              <option value="api">API</option>
              <option value="business">Business</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <div key={section.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                  section.category === 'platform' ? 'text-blue-400 bg-blue-400/10' :
                  section.category === 'api' ? 'text-green-400 bg-green-400/10' :
                  section.category === 'business' ? 'text-purple-400 bg-purple-400/10' :
                  'text-orange-400 bg-orange-400/10'
                }`}>
                  {section.category}
                </span>
              </div>
              
              <p className="text-gray-400 mb-6">{section.description}</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {section.documents.map((doc) => (
                  <div key={doc.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(doc.type)}
                        <h3 className="text-white font-medium">{doc.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAccessLevelColor(doc.access_level)}`}>
                          {doc.access_level}
                        </span>
                        <button className="text-gray-400 hover:text-blue-400">
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-3">{doc.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                            +{doc.tags.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Updated {doc.last_updated}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left transition-colors">
              <CodeBracketIcon className="w-6 h-6 mb-2" />
              <h3 className="font-medium">API Documentation</h3>
              <p className="text-sm text-blue-200">Complete API reference</p>
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-left transition-colors">
              <ShieldCheckIcon className="w-6 h-6 mb-2" />
              <h3 className="font-medium">Compliance Center</h3>
              <p className="text-sm text-purple-200">Security & compliance docs</p>
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left transition-colors">
              <UsersIcon className="w-6 h-6 mb-2" />
              <h3 className="font-medium">User Guides</h3>
              <p className="text-sm text-green-200">Training & user materials</p>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {sections.reduce((total, section) => total + section.documents.length, 0)}
            </div>
            <p className="text-gray-400 text-sm">Total Documents</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {sections.reduce((total, section) => 
                total + section.documents.filter(doc => doc.access_level === 'founder').length, 0
              )}
            </div>
            <p className="text-gray-400 text-sm">Founder-Only Docs</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {sections.filter(section => section.category === 'api').length}
            </div>
            <p className="text-gray-400 text-sm">API Sections</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              {sections.filter(section => section.category === 'compliance').length}
            </div>
            <p className="text-gray-400 text-sm">Compliance Docs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformDocumentation;