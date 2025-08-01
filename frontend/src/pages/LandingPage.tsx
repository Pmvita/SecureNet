import React, { useState } from 'react';
import { 
  ChartBarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  BellIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface EmailSignup {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
}

const LandingPage: React.FC = () => {
  const [showSignup, setShowSignup] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [signupData, setSignupData] = useState<EmailSignup>({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    jobTitle: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call (in real implementation, use email service like ConvertKit, Mailchimp, etc.)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Store in localStorage for now (in production, send to email service)
    const existingSignups = JSON.parse(localStorage.getItem('securenet-signups') || '[]');
    existingSignups.push({
      ...signupData,
      timestamp: new Date().toISOString(),
      source: 'landing-page'
    });
    localStorage.setItem('securenet-signups', JSON.stringify(existingSignups));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'AI-Powered Threat Detection',
      description: 'Advanced machine learning algorithms detect and prevent security threats in real-time.',
      color: 'text-red-400'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-Time Analytics',
      description: 'Comprehensive dashboards provide instant insights into your network security posture.',
      color: 'text-blue-400'
    },
    {
      icon: GlobeAltIcon,
      title: 'Network Monitoring',
      description: 'Complete visibility into your network infrastructure with automated threat response.',
      color: 'text-green-400'
    },
    {
      icon: BellIcon,
      title: 'Intelligent Alerts',
      description: 'Smart notification system ensures you know about threats the moment they appear.',
      color: 'text-yellow-400'
    },
    {
      icon: UserGroupIcon,
      title: 'Enterprise Scale',
      description: 'Built for enterprise environments with multi-tenant architecture and role-based access.',
      color: 'text-purple-400'
    },
    {
      icon: SparklesIcon,
      title: 'Automated Response',
      description: 'Intelligent automation responds to threats instantly, minimizing damage and downtime.',
      color: 'text-pink-400'
    }
  ];

  const benefits = [
    'Reduce security incidents by 95%',
    'Cut response time from hours to seconds',
    'Enterprise-grade compliance (SOC 2, ISO 27001)',
    'Seamless integration with existing infrastructure',
    'AI-powered predictive threat analysis',
    '24/7 automated monitoring and response'
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/SecureNet-logo-3.png" 
                alt="SecureNet" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-white">SecureNet</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowComingSoon(true)}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Get Early Access
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Enterprise Security
                <span className="block text-blue-400">Redefined</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                AI-powered network security monitoring and management platform that detects, prevents, and responds to threats in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowSignup(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  Join the Waitlist
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowComingSoon(true)}
                  className="border border-gray-600 hover:border-gray-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
                >
                  Request Demo
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Next-Generation Security Platform
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for modern enterprises that need comprehensive security without compromising performance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
              >
                <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Enterprise Leaders Choose SecureNet
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Transform your security infrastructure with AI-powered intelligence that adapts to evolving threats.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <img 
                  src="/screenshots/dashboard.png" 
                  alt="SecureNet Dashboard Preview" 
                  className="w-full h-auto rounded-lg"
                  onError={(e) => {
                    // Fallback if screenshot doesn't exist
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Revolutionize Your Security?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of enterprise security teams who trust SecureNet to protect their critical infrastructure.
          </p>
          <button
            onClick={() => setShowSignup(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center gap-2"
          >
            Get Early Access Today
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/SecureNet-logo-3.png" 
                  alt="SecureNet" 
                  className="h-6 w-auto"
                />
                <span className="text-lg font-bold text-white">SecureNet</span>
              </div>
              <p className="text-gray-400">
                Enterprise security platform powered by AI and machine learning.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>info@securenet.ai</li>
                <li>+1 (555) 123-4567</li>
                <li>San Francisco, CA</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SecureNet Technologies Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Email Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full"
          >
            {isSubmitted ? (
              <div className="text-center">
                <CheckIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-gray-300 mb-6">
                  You've been added to our waitlist. We'll notify you when SecureNet launches.
                </p>
                <button
                  onClick={() => {
                    setShowSignup(false);
                    setIsSubmitted(false);
                    setSignupData({ email: '', firstName: '', lastName: '', company: '', jobTitle: '' });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Join the Waitlist</h3>
                  <button
                    onClick={() => setShowSignup(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                      <input
                        type="text"
                        required
                        value={signupData.firstName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        required
                        value={signupData.lastName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                    <input
                      type="text"
                      required
                      value={signupData.company}
                      onChange={(e) => setSignupData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Job Title</label>
                    <input
                      type="text"
                      value={signupData.jobTitle}
                      onChange={(e) => setSignupData(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Joining Waitlist...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="w-5 h-5" />
                        Join Waitlist
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full text-center"
          >
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Coming Soon!</h3>
            <p className="text-gray-300 mb-6">
              SecureNet is currently in development. Join our waitlist to be notified when we launch!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowComingSoon(false);
                  setShowSignup(true);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Join Waitlist
              </button>
              <button
                onClick={() => setShowComingSoon(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;