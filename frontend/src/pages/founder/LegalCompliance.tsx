import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface LegalDocument {
  id: string;
  name: string;
  type: 'privacy_policy' | 'terms_of_service' | 'data_processing' | 'security_policy' | 'compliance_cert';
  version: string;
  last_updated: string;
  status: 'active' | 'draft' | 'expired';
  file_url?: string;
  description: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  status: 'compliant' | 'in_progress' | 'not_compliant';
  last_audit: string;
  next_audit: string;
  certificate_url?: string;
  requirements_met: number;
  total_requirements: number;
}

const LegalCompliance: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    fetchLegalData();
  }, []);

  const fetchLegalData = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation would fetch from API
      setDocuments([
        {
          id: '1',
          name: 'Privacy Policy',
          type: 'privacy_policy',
          version: '2.1',
          last_updated: '2024-07-15',
          status: 'active',
          file_url: '/docs/privacy-policy-v2.1.pdf',
          description: 'Comprehensive privacy policy covering data collection, processing, and user rights'
        },
        {
          id: '2',
          name: 'Terms of Service',
          type: 'terms_of_service',
          version: '3.0',
          last_updated: '2024-06-01',
          status: 'active',
          file_url: '/docs/terms-of-service-v3.0.pdf',
          description: 'Platform terms of service and user agreement'
        },
        {
          id: '3',
          name: 'Data Processing Agreement',
          type: 'data_processing',
          version: '1.5',
          last_updated: '2024-05-20',
          status: 'active',
          file_url: '/docs/dpa-v1.5.pdf',
          description: 'GDPR-compliant data processing agreement for enterprise customers'
        },
        {
          id: '4',
          name: 'Security Policy Framework',
          type: 'security_policy',
          version: '2.0',
          last_updated: '2024-08-01',
          status: 'draft',
          description: 'Comprehensive security policy and incident response procedures'
        }
      ]);

      setFrameworks([
        {
          id: '1',
          name: 'SOC 2 Type II',
          status: 'compliant',
          last_audit: '2024-06-15',
          next_audit: '2025-06-15',
          certificate_url: '/certificates/soc2-type2-2024.pdf',
          requirements_met: 147,
          total_requirements: 147
        },
        {
          id: '2',
          name: 'ISO 27001',
          status: 'in_progress',
          last_audit: '2024-03-10',
          next_audit: '2024-12-10',
          requirements_met: 89,
          total_requirements: 114
        },
        {
          id: '3',
          name: 'GDPR',
          status: 'compliant',
          last_audit: '2024-07-01',
          next_audit: '2025-07-01',
          requirements_met: 23,
          total_requirements: 23
        },
        {
          id: '4',
          name: 'HIPAA',
          status: 'in_progress',
          last_audit: '2024-04-20',
          next_audit: '2024-10-20',
          requirements_met: 12,
          total_requirements: 18
        },
        {
          id: '5',
          name: 'FedRAMP',
          status: 'not_compliant',
          last_audit: '2024-02-01',
          next_audit: '2024-11-01',
          requirements_met: 45,
          total_requirements: 325
        }
      ]);
    } catch (error) {
      console.error('Error fetching legal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'compliant':
        return 'text-green-400 bg-green-400/10';
      case 'draft':
      case 'in_progress':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'expired':
      case 'not_compliant':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'compliant':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'draft':
      case 'in_progress':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'expired':
      case 'not_compliant':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const calculateCompliancePercentage = (met: number, total: number) => {
    return Math.round((met / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading legal & compliance data...</p>
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
            <ClipboardDocumentListIcon className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Legal & Compliance</h1>
          </div>
          <p className="text-gray-400 mb-4">
            Manage legal documents, compliance frameworks, and regulatory requirements
          </p>
          <div className="p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg">
            <p className="text-purple-300 text-sm">
              👑 <strong>Founder Controls:</strong> Complete oversight of legal compliance, regulatory adherence, and corporate governance.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'documents'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5" />
              Legal Documents
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'compliance'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <ShieldCheckIcon className="w-5 h-5" />
              Compliance Frameworks
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Legal Documents</h2>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">
                Upload New Document
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold">{doc.name}</h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          <span className="ml-1 capitalize">{doc.status}</span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{doc.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Version {doc.version}</span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {doc.last_updated}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm flex items-center gap-1">
                      <EyeIcon className="w-4 h-4" />
                      View
                    </button>
                    <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm flex items-center gap-1">
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    {doc.file_url && (
                      <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm flex items-center gap-1">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Compliance Frameworks</h2>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">
                Add Framework
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {frameworks.map((framework) => (
                <div key={framework.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold">{framework.name}</h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(framework.status)}`}>
                          {getStatusIcon(framework.status)}
                          <span className="ml-1 capitalize">{framework.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                          <span>Requirements Met</span>
                          <span>{framework.requirements_met}/{framework.total_requirements}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              framework.status === 'compliant' ? 'bg-green-400' :
                              framework.status === 'in_progress' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${calculateCompliancePercentage(framework.requirements_met, framework.total_requirements)}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1">
                          {calculateCompliancePercentage(framework.requirements_met, framework.total_requirements)}% Complete
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          Last Audit: {framework.last_audit}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Next Audit: {framework.next_audit}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm flex items-center gap-1">
                      <EyeIcon className="w-4 h-4" />
                      Details
                    </button>
                    {framework.certificate_url && (
                      <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm flex items-center gap-1">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Certificate
                      </button>
                    )}
                    <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm flex items-center gap-1">
                      <PencilIcon className="w-4 h-4" />
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance Summary */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Compliance Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    {frameworks.filter(f => f.status === 'compliant').length}
                  </div>
                  <p className="text-gray-400">Fully Compliant</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-2">
                    {frameworks.filter(f => f.status === 'in_progress').length}
                  </div>
                  <p className="text-gray-400">In Progress</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-2">
                    {frameworks.filter(f => f.status === 'not_compliant').length}
                  </div>
                  <p className="text-gray-400">Needs Attention</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalCompliance;