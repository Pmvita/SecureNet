import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import { Alert } from '../../components/common/Alert/Alert';
import { apiClient } from '../../api/client';
import {
  DocumentTextIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  DocumentIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';

interface DocumentationCategory {
  [key: string]: DocumentationItem[];
}

interface DocumentationItem {
  title: string;
  path: string;
  description: string;
  category: string;
  confidential?: boolean;
}

interface DocumentationData {
  documentation: DocumentationCategory;
  total_documents: number;
  categories: string[];
  access_level: string;
}

interface DocumentContent {
  path: string;
  content: string;
  metadata: {
    size_bytes: number;
    last_modified: string;
    encoding: string;
    content_type: string;
  };
}

const DocumentationViewer: React.FC = () => {
  const [documentation, setDocumentation] = useState<DocumentationData | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isViewingDocument, setIsViewingDocument] = useState(false);

  useEffect(() => {
    fetchDocumentationList();
  }, []);

  const fetchDocumentationList = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get<DocumentationData>('/api/founder/documentation/list');
      setDocumentation(response.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentContent = async (path: string) => {
    try {
      setLoading(true);
      
      const response = await apiClient.get<DocumentContent>(`/api/founder/documentation/content?path=${encodeURIComponent(path)}`);
      setSelectedDocument(response.data);
      setIsViewingDocument(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'setup': case 'quick_start':
        return <DocumentIcon className="w-5 h-5 text-green-400" />;
      case 'enterprise':
        return <LockClosedIcon className="w-5 h-5 text-purple-400" />;
      case 'project management': case 'project_management':
        return <FolderIcon className="w-5 h-5 text-blue-400" />;
      case 'technical':
        return <DocumentTextIcon className="w-5 h-5 text-orange-400" />;
      case 'compliance':
        return <LockClosedIcon className="w-5 h-5 text-red-400" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatCategoryName = (category: string) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAllDocuments = (): DocumentationItem[] => {
    if (!documentation) return [];
    
    return Object.values(documentation.documentation).flat();
  };

  const getFilteredDocuments = (): DocumentationItem[] => {
    const allDocs = getAllDocuments();
    
    let filtered = allDocs;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => 
        documentation!.documentation[selectedCategory]?.includes(doc)
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !documentation) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-xl text-gray-300">Loading documentation...</div>
      </div>
    );
  }

  if (error && !documentation) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <Alert type="error" title="Error" message={error} />
        </div>
      </div>
    );
  }

  if (!documentation) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <Alert type="warning" title="No Documentation Available" message="Please check your access permissions." />
        </div>
      </div>
    );
  }

  // Document Viewer Mode
  if (isViewingDocument && selectedDocument) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Document Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewingDocument(false);
                    setSelectedDocument(null);
                  }}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Documentation
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-white">{selectedDocument.path.split('/').pop()}</h1>
                  <p className="text-sm text-blue-100">
                    {formatFileSize(selectedDocument.metadata.size_bytes)} • 
                    Last modified: {formatDate(selectedDocument.metadata.last_modified)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([selectedDocument.content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedDocument.path.split('/').pop() || 'document.md';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2"
              >
                <CloudArrowDownIcon className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-900 rounded-lg border border-gray-800">
            <div className="p-8">
              <div className="prose prose-lg max-w-none">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-300 bg-gray-800 border border-gray-700 p-6 rounded-lg overflow-auto">
                  {selectedDocument.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Documentation List Mode
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <DocumentTextIcon className="w-8 h-8 text-blue-200" />
                Project Documentation
              </h1>
              <p className="text-purple-100 mt-1">
                Complete access to all SecureNet project documentation and technical resources
              </p>
            </div>
            <div className="text-sm text-blue-100">
              {documentation.total_documents} documents • {documentation.access_level}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Search and Filters */}
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {documentation.categories.map(category => (
                  <option key={category} value={category}>
                    {formatCategoryName(category)} ({documentation.documentation[category]?.length || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documentation Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {getFilteredDocuments().map((doc, index) => (
            <motion.div
              key={`${doc.path}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="bg-gray-900 border border-gray-800 rounded-lg h-full hover:bg-gray-800/50 transition-colors cursor-pointer">
                <div 
                  className="p-6 h-full flex flex-col"
                  onClick={() => fetchDocumentContent(doc.path)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(doc.category)}
                      <span className="text-sm font-medium text-gray-400">
                        {formatCategoryName(doc.category)}
                      </span>
                    </div>
                    {doc.confidential && (
                      <LockClosedIcon className="w-4 h-4 text-red-400" title="Confidential" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {doc.title}
                  </h3>
                  
                  <p className="text-gray-300 text-sm mb-4 flex-1 line-clamp-3">
                    {doc.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2 py-1 rounded">
                      {doc.path.split('/').pop()}
                    </span>
                    <Button size="sm" variant="outline" className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800">
                      View Document →
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {getFilteredDocuments().length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No documents found</h3>
            <p className="text-gray-400">
              {searchTerm ? 'Try adjusting your search terms or filters.' : 'No documentation available in this category.'}
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-300">Loading document...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentationViewer; 