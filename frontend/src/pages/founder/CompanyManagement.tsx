import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PhotoIcon,
  GlobeAltIcon,
  LanguageIcon,
  MapPinIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface CompanySettings {
  company_name: string;
  legal_name: string;
  headquarters: string;
  founded_year: number;
  employee_count: number;
  description: string;
  website: string;
  logo_url: string;
  brand_colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  contact_info: {
    support_email: string;
    sales_email: string;
    legal_email: string;
    phone: string;
  };
  locations: Array<{
    id: string;
    name: string;
    address: string;
    type: 'headquarters' | 'office' | 'data_center';
    employee_count: number;
  }>;
}

const CompanyManagement: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation would fetch from API
      setSettings({
        company_name: 'SecureNet',
        legal_name: 'SecureNet Technologies Inc.',
        headquarters: 'San Francisco, CA',
        founded_year: 2023,
        employee_count: 42,
        description: 'AI-powered network security monitoring and management platform',
        website: 'https://securenet-ai.vercel.app',
        logo_url: '/SecureNet-logo-3.png',
        brand_colors: {
          primary: '#3B82F6',
          secondary: '#1E40AF',
          accent: '#06B6D4'
        },
        contact_info: {
          support_email: 'support@securenet.ai',
          sales_email: 'sales@securenet.ai',
          legal_email: 'legal@securenet.ai',
          phone: '+1 (555) 123-4567'
        },
        locations: [
          {
            id: '1',
            name: 'San Francisco HQ',
            address: '123 Market Street, San Francisco, CA 94105',
            type: 'headquarters',
            employee_count: 28
          },
          {
            id: '2',
            name: 'Austin Office',
            address: '456 Congress Ave, Austin, TX 78701',
            type: 'office',
            employee_count: 14
          },
          {
            id: '3',
            name: 'AWS US-East-1',
            address: 'Virginia Data Center',
            type: 'data_center',
            employee_count: 0
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In real implementation would save to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Company settings saved');
    } catch (error) {
      console.error('Error saving company settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General Info', icon: BuildingOfficeIcon },
    { id: 'branding', label: 'Branding', icon: PhotoIcon },
    { id: 'locations', label: 'Locations', icon: MapPinIcon },
    { id: 'contact', label: 'Contact Info', icon: GlobeAltIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading company settings...</p>
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
            <BuildingOfficeIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Company Management</h1>
          </div>
          <p className="text-gray-400 mb-4">
            Manage SecureNet company information, branding, and global settings
          </p>
          <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              👑 <strong>Founder Controls:</strong> Complete control over company identity, branding, and organizational structure.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Company Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={settings?.company_name || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, company_name: e.target.value} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Legal Name</label>
                    <input
                      type="text"
                      value={settings?.legal_name || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, legal_name: e.target.value} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Founded Year</label>
                    <input
                      type="number"
                      value={settings?.founded_year || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, founded_year: parseInt(e.target.value)} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Employee Count</label>
                    <input
                      type="number"
                      value={settings?.employee_count || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, employee_count: parseInt(e.target.value)} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Description & Website</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company Description</label>
                    <textarea
                      value={settings?.description || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, description: e.target.value} : null)}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Website URL</label>
                    <input
                      type="url"
                      value={settings?.website || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, website: e.target.value} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Headquarters</label>
                    <input
                      type="text"
                      value={settings?.headquarters || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, headquarters: e.target.value} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Brand Colors</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings?.brand_colors.primary || '#3B82F6'}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev, 
                          brand_colors: {...prev.brand_colors, primary: e.target.value}
                        } : null)}
                        className="w-12 h-10 rounded border border-gray-600"
                      />
                      <input
                        type="text"
                        value={settings?.brand_colors.primary || '#3B82F6'}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev, 
                          brand_colors: {...prev.brand_colors, primary: e.target.value}
                        } : null)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings?.brand_colors.secondary || '#1E40AF'}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev, 
                          brand_colors: {...prev.brand_colors, secondary: e.target.value}
                        } : null)}
                        className="w-12 h-10 rounded border border-gray-600"
                      />
                      <input
                        type="text"
                        value={settings?.brand_colors.secondary || '#1E40AF'}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev, 
                          brand_colors: {...prev.brand_colors, secondary: e.target.value}
                        } : null)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings?.brand_colors.accent || '#06B6D4'}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev, 
                          brand_colors: {...prev.brand_colors, accent: e.target.value}
                        } : null)}
                        className="w-12 h-10 rounded border border-gray-600"
                      />
                      <input
                        type="text"
                        value={settings?.brand_colors.accent || '#06B6D4'}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev, 
                          brand_colors: {...prev.brand_colors, accent: e.target.value}
                        } : null)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Logo & Assets</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company Logo</label>
                    <div className="flex items-center gap-4">
                      <img 
                        src={settings?.logo_url} 
                        alt="Company Logo" 
                        className="w-16 h-16 object-contain bg-white rounded border border-gray-600"
                      />
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                        Upload New Logo
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
                    <input
                      type="url"
                      value={settings?.logo_url || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, logo_url: e.target.value} : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Company Locations</h2>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Add Location
                </button>
              </div>
              <div className="space-y-4">
                {settings?.locations.map((location) => (
                  <div key={location.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">{location.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          location.type === 'headquarters' ? 'bg-purple-900 text-purple-300' :
                          location.type === 'office' ? 'bg-blue-900 text-blue-300' :
                          'bg-green-900 text-green-300'
                        }`}>
                          {location.type.replace('_', ' ')}
                        </span>
                        <button className="text-gray-400 hover:text-blue-400">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-400">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{location.address}</p>
                    <p className="text-gray-400 text-sm">
                      {location.employee_count} {location.employee_count === 1 ? 'employee' : 'employees'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Support Email</label>
                  <input
                    type="email"
                    value={settings?.contact_info.support_email || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev, 
                      contact_info: {...prev.contact_info, support_email: e.target.value}
                    } : null)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sales Email</label>
                  <input
                    type="email"
                    value={settings?.contact_info.sales_email || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev, 
                      contact_info: {...prev.contact_info, sales_email: e.target.value}
                    } : null)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Legal Email</label>
                  <input
                    type="email"
                    value={settings?.contact_info.legal_email || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev, 
                      contact_info: {...prev.contact_info, legal_email: e.target.value}
                    } : null)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={settings?.contact_info.phone || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev, 
                      contact_info: {...prev.contact_info, phone: e.target.value}
                    } : null)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;