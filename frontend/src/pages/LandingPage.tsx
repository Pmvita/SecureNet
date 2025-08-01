import React, { useState } from 'react';
import { 
  ShieldCheckIcon, 
  ChartBarIcon, 
  GlobeAltIcon, 
  ExclamationTriangleIcon,
  CheckIcon,
  StarIcon,
  ArrowRightIcon,
  PlayIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
  BellIcon,
  UserGroupIcon,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      title: "AI-Powered Threat Detection",
      description: "Advanced machine learning algorithms detect and prevent cyber threats in real-time"
    },
    {
      icon: ChartBarIcon,
      title: "Comprehensive Analytics",
      description: "Deep insights into network security with predictive risk assessment"
    },
    {
      icon: GlobeAltIcon,
      title: "Network Discovery",
      description: "Automated device scanning and network topology visualization"
    },
    {
      icon: ExclamationTriangleIcon,
      title: "Real-Time Alerts",
      description: "Instant notifications with smart categorization and priority filtering"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$99",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "5 users included",
        "25 devices",
        "5GB storage",
        "5,000 API calls/month",
        "500 alerts/month",
        "AI-powered threat detection",
        "Email support",
        "30-day log retention"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional",
      price: "$299",
      period: "/month",
      description: "Ideal for growing security teams",
      features: [
        "50 users",
        "250 devices",
        "25GB storage",
        "25,000 API calls/month",
        "2,500 alerts/month",
        "Advanced AI threat detection",
        "Priority support",
        "Compliance reporting",
        "90-day log retention"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Business",
      price: "$799",
      period: "/month",
      description: "For large organizations with advanced needs",
      features: [
        "500 users",
        "2,500 devices",
        "100GB storage",
        "100,000 API calls/month",
        "10,000 alerts/month",
        "Enterprise AI threat detection",
        "24/7 support",
        "Custom integrations",
        "Advanced analytics",
        "Dedicated account manager"
      ],
      cta: "Contact Sales",
      popular: false
    },
    {
      name: "Enterprise",
      price: "$1,999",
      period: "/month",
      description: "For enterprise organizations",
      features: [
        "1,000 users",
        "5,000 devices",
        "500GB storage",
        "500,000 API calls/month",
        "50,000 alerts/month",
        "Full enterprise security suite",
        "Dedicated support",
        "Custom development",
        "SLA guarantees",
        "On-premise deployment"
      ],
      cta: "Contact Sales",
      popular: false
    },
    {
      name: "MSP Bundle",
      price: "$2,999",
      period: "/month",
      description: "For Managed Service Providers",
      features: [
        "1,000 users",
        "10,000 devices",
        "1TB storage",
        "1,000,000 API calls/month",
        "100,000 alerts/month",
        "Complete MSP solution",
        "White-label options",
        "Partner dashboard",
        "Revenue sharing",
        "Custom integrations"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CISO",
      company: "TechCorp Inc.",
      content: "SecureNet has transformed our security operations. The AI-powered threat detection is game-changing.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Security Manager",
      company: "DataFlow Systems",
      content: "Incredible platform with intuitive interface. Our incident response time has improved by 90%.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "IT Director",
      company: "Innovation Labs",
      content: "Easy to deploy and the customer support is exceptional. Highly recommended for any organization.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-200 dark:text-gray-100">
      {/* Navigation */}
      <nav className="glass-card border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold text-white">SecureNet</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
              <button
                onClick={() => setShowComingSoon(true)}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => setShowSignup(true)}
                className="btn-primary"
              >
                Get Early Access
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <a href="#features" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">Pricing</a>
                <a href="#about" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">About</a>
                <button
                  onClick={() => setShowComingSoon(true)}
                  className="block px-3 py-2 text-gray-300 hover:text-white transition-colors w-full text-left"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowSignup(true)}
                  className="block px-3 py-2 btn-primary w-full text-left"
                >
                  Get Early Access
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                AI-Powered Network Defense
                <span className="text-primary-500"> for the Modern Enterprise</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                SecureNet delivers autonomous threat detection, predictive risk assessment, and intelligent security operations management. 
                Protect your network with enterprise-grade cybersecurity powered by artificial intelligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowSignup(true)}
                  className="btn-primary text-lg font-semibold px-8 py-4 inline-flex items-center justify-center"
                >
                  Join the Waitlist
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </button>
                <button 
                  onClick={() => setShowComingSoon(true)}
                  className="border border-gray-600 text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center"
                >
                  <PlayIcon className="mr-2 h-5 w-5" />
                  Watch Demo
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
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Next-Generation Security Platform
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for modern enterprises that need comprehensive security without compromising performance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-primary-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your organization's security needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative bg-gray-800 border rounded-lg p-6 ${
                  plan.popular ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    {plan.price}<span className="text-lg text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-gray-300">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckIcon className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowSignup(true)}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? 'bg-primary-500 hover:bg-primary-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Security Leaders
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See what our customers are saying about SecureNet
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-gray-400">{testimonial.role}, {testimonial.company}</div>
                </div>
              </motion.div>
            ))}
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
      <footer id="about" className="border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-primary-500" />
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