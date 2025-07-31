import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "5 devices",
        "10 scans per month",
        "7-day log retention",
        "Basic network scanning",
        "Email alerts"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$149",
      period: "/month",
      description: "Ideal for growing security teams",
      features: [
        "50 devices",
        "500 scans per month",
        "30-day log retention",
        "Advanced vulnerability scanning",
        "ML anomaly detection",
        "Slack/Teams integration",
        "Custom dashboards",
        "API access"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$499",
      period: "/month",
      description: "For large organizations with advanced needs",
      features: [
        "1000+ devices",
        "Unlimited scanning",
        "1-year log retention",
        "Advanced ML threat detection",
        "Full integrations suite",
        "White-label options",
        "Dedicated support",
        "Compliance reporting",
        "On-premise deployment"
      ],
      cta: "Contact Sales",
      popular: false
    },
    {
      name: "MSP Bundle",
      price: "$999",
      period: "/month",
      description: "For Managed Service Providers",
      features: [
        "Unlimited devices",
        "Unlimited scanning",
        "Unlimited log retention",
        "Multi-tenant management",
        "White-label platform",
        "Reseller capabilities",
        "Dedicated account manager",
        "Custom integrations",
        "Priority support",
        "Revenue sharing"
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
      company: "Global Solutions",
      content: "The real-time alerts and comprehensive analytics have significantly improved our incident response time.",
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
    <div className="min-h-screen bg-dark-200 text-gray-100">
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
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
              <Link 
                to="/signup" 
                className="btn-primary"
              >
                Get Started
              </Link>
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
                <Link to="/login" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">Login</Link>
                <Link to="/signup" className="block px-3 py-2 btn-primary">Get Started</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              AI-Powered Network Defense
              <span className="text-primary-500"> for the Modern Enterprise</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              SecureNet delivers autonomous threat detection, predictive risk assessment, and intelligent security operations management. 
              Protect your network with enterprise-grade cybersecurity powered by artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="btn-primary text-lg font-semibold px-8 py-4 inline-flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <button className="border border-gray-600 text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center">
                <PlayIcon className="mr-2 h-5 w-5" />
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-dark-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Enterprise-Grade Security Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive cybersecurity platform designed for modern organizations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="glass-card p-6 text-center hover:transform hover:-translate-y-1 transition-all duration-300">
                <feature.icon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-dark-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choose the plan that fits your organization's security needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`glass-card p-8 relative ${
                  plan.popular ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 ml-1">{plan.period}</span>
                  </div>
                  <p className="text-gray-300 mt-2">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm">
                      <CheckIcon className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  to="/signup"
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-center block transition-colors ${
                    plan.popular
                      ? 'btn-primary'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-dark-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Security Leaders
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              See what our customers say about SecureNet
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-card p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-gray-400">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Secure Your Network?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
            Join thousands of organizations that trust SecureNet for their cybersecurity needs. 
            Start your free trial today.
          </p>
          <Link
            to="/signup"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
          >
            Start Free Trial
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-300 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-primary-500" />
                <span className="ml-2 text-xl font-bold text-white">SecureNet</span>
              </div>
              <p className="text-gray-400">
                AI-powered cybersecurity platform for modern enterprises.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SecureNet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 