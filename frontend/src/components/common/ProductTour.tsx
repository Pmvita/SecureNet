import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Placement } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * SecureNet Interactive Product Tour
 * Day 4 Sprint 1: Advanced onboarding and feature discovery
 */

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'platform_owner' | 'security_admin' | 'soc_analyst';
  isFirstLogin?: boolean;
}

interface TourStep extends Step {
  content: React.ReactNode;
  placement?: Placement;
  disableBeacon?: boolean;
  hideCloseButton?: boolean;
  hideFooter?: boolean;
  styles?: any;
}

export const ProductTour: React.FC<ProductTourProps> = ({ 
  isOpen, 
  onClose, 
  userRole, 
  isFirstLogin = false 
}) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourType, setTourType] = useState<'welcome' | 'feature' | 'advanced'>('welcome');

  // Tour steps based on user role
  const getTourSteps = (): TourStep[] => {
    const baseSteps: TourStep[] = [
      {
        target: 'body',
        content: (
          <div className="tour-welcome">
            <h2 className="text-2xl font-bold text-white mb-4">
              Welcome to SecureNet Enterprise! 🚀
            </h2>
            <p className="text-gray-300 mb-4">
              Let's take a quick tour to help you get started with our AI-powered security platform.
            </p>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-sm">Your Role:</span>
              <span className="font-semibold capitalize">{userRole.replace('_', ' ')}</span>
            </div>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-testid="main-navigation"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Navigation Hub</h3>
            <p className="text-gray-300 mb-3">
              Your central command center. Access all SecureNet features from here.
            </p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Dashboard - Real-time security overview</li>
              <li>• Security - Threat detection & analysis</li>
              <li>• Network - Device monitoring</li>
              <li>• Logs - Comprehensive audit trails</li>
            </ul>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-testid="security-metrics"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Security Metrics</h3>
            <p className="text-gray-300 mb-3">
              Real-time security insights at a glance. Monitor your organization's security posture.
            </p>
            <div className="bg-blue-900/30 p-3 rounded border border-blue-500/30">
              <p className="text-blue-300 text-sm">
                💡 Tip: Click on any metric for detailed analysis
              </p>
            </div>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-testid="recent-alerts"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Security Alerts</h3>
            <p className="text-gray-300 mb-3">
              Stay informed about the latest security events and threats in your environment.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-400">Critical - Immediate attention required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400">Warning - Monitor closely</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-400">Info - For your awareness</span>
              </div>
            </div>
          </div>
        ),
        placement: 'left',
      }
    ];

    // Role-specific steps
    const roleSpecificSteps: Record<string, TourStep[]> = {
      platform_owner: [
        {
          target: '[data-testid="admin-nav"]',
          content: (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Admin Controls</h3>
              <p className="text-gray-300 mb-3">
                As a Platform Owner, you have full administrative access to:
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• User management and role assignments</li>
                <li>• System configuration and settings</li>
                <li>• Billing and subscription management</li>
                <li>• Enterprise security policies</li>
              </ul>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-testid="user-menu"]',
          content: (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Account Settings</h3>
              <p className="text-gray-300 mb-3">
                Manage your profile, security preferences, and MFA settings.
              </p>
              <div className="bg-green-900/30 p-3 rounded border border-green-500/30">
                <p className="text-green-300 text-sm">
                  🔒 We recommend enabling MFA for enhanced security
                </p>
              </div>
            </div>
          ),
          placement: 'bottom-end',
        }
      ],
      security_admin: [
        {
          target: '[data-testid="nav-security"]',
          content: (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Security Operations</h3>
              <p className="text-gray-300 mb-3">
                As a Security Admin, focus on these core capabilities:
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Threat detection and response</li>
                <li>• Security policy management</li>
                <li>• Incident investigation tools</li>
                <li>• Compliance reporting</li>
              </ul>
            </div>
          ),
          placement: 'right',
        }
      ],
      soc_analyst: [
        {
          target: '[data-testid="nav-logs"]',
          content: (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Security Logs</h3>
              <p className="text-gray-300 mb-3">
                As a SOC Analyst, you'll spend most time analyzing:
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Security event logs and patterns</li>
                <li>• Network traffic anomalies</li>
                <li>• User behavior analysis</li>
                <li>• Threat intelligence feeds</li>
              </ul>
            </div>
          ),
          placement: 'right',
        }
      ]
    };

    const finalStep: TourStep = {
      target: '[data-testid="help-center"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Need Help? 🆘</h3>
          <p className="text-gray-300 mb-4">
            You're all set! Here are some helpful resources:
          </p>
          <div className="space-y-2 text-sm">
            <button className="w-full text-left p-2 bg-blue-900/30 rounded border border-blue-500/30 text-blue-300 hover:bg-blue-900/50">
              📚 Documentation & Guides
            </button>
            <button className="w-full text-left p-2 bg-purple-900/30 rounded border border-purple-500/30 text-purple-300 hover:bg-purple-900/50">
              💬 Community Support
            </button>
            <button className="w-full text-left p-2 bg-green-900/30 rounded border border-green-500/30 text-green-300 hover:bg-green-900/50">
              🎥 Video Tutorials
            </button>
          </div>
        </div>
      ),
      placement: 'left',
    };

    return [
      ...baseSteps,
      ...(roleSpecificSteps[userRole] || []),
      finalStep
    ];
  };

  const tourSteps = getTourSteps();

  useEffect(() => {
    if (isOpen) {
      setRun(true);
      setStepIndex(0);
    }
  }, [isOpen]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      onClose();
    } else if (type === 'step:after') {
      setStepIndex(index);
    }
  };

  const tourStyles = {
    options: {
      primaryColor: '#3b82f6',
      backgroundColor: '#1f2937',
      textColor: '#f9fafb',
      overlayColor: 'rgba(0, 0, 0, 0.8)',
      arrowColor: '#1f2937',
      zIndex: 10000,
    },
    tooltip: {
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      color: '#f9fafb',
      fontSize: '14px',
      padding: '20px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      border: '1px solid #374151',
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    tooltipTitle: {
      color: '#f9fafb',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
    },
    tooltipContent: {
      color: '#d1d5db',
      lineHeight: '1.6',
    },
    buttonNext: {
      backgroundColor: '#3b82f6',
      borderRadius: '8px',
      border: 'none',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      padding: '10px 20px',
      cursor: 'pointer',
    },
    buttonBack: {
      backgroundColor: 'transparent',
      border: '1px solid #6b7280',
      borderRadius: '8px',
      color: '#d1d5db',
      fontSize: '14px',
      fontWeight: '600',
      padding: '10px 20px',
      cursor: 'pointer',
      marginRight: '10px',
    },
    buttonSkip: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#9ca3af',
      fontSize: '12px',
      cursor: 'pointer',
    },
    beacon: {
      backgroundColor: '#3b82f6',
      animation: 'pulse 2s infinite',
    },
    spotlight: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    }
  };

  // Custom beacon component with animation
  const CustomBeacon = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      className="relative"
    >
      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
      <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75"></div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Joyride
            steps={tourSteps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={tourStyles}
            locale={{
              back: 'Previous',
              close: 'Close',
              last: 'Finish Tour',
              next: 'Next',
              skip: 'Skip Tour',
              open: 'Open',
            }}
            floaterProps={{
              disableAnimation: false,
            }}
            tooltipComponent={({ index, isLastStep, step, backProps, closeProps, primaryProps, skipProps, tooltipProps }) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="joyride-tooltip"
                {...tooltipProps}
                style={{
                  ...tooltipProps.style,
                  ...tourStyles.tooltip,
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {index + 1} of {tourSteps.length}
                    </span>
                    {isFirstLogin && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Welcome!
                      </span>
                    )}
                  </div>
                  <button
                    {...closeProps}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  {step.content}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    {...skipProps}
                    className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                  >
                    Skip Tour
                  </button>
                  
                  <div className="flex gap-3">
                    {index > 0 && (
                      <button
                        {...backProps}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Previous
                      </button>
                    )}
                    <button
                      {...primaryProps}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      {isLastStep ? 'Finish Tour' : 'Next'}
                      {!isLastStep && <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 w-full bg-gray-700 rounded-full h-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((index + 1) / tourSteps.length) * 100}%` }}
                    className="bg-blue-500 h-1 rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          />
        </>
      )}
    </AnimatePresence>
  );
};

// Tour trigger component for easy integration
export const TourTrigger: React.FC<{
  userRole: 'platform_owner' | 'security_admin' | 'soc_analyst';
  isFirstLogin?: boolean;
}> = ({ userRole, isFirstLogin = false }) => {
  const [showTour, setShowTour] = useState(isFirstLogin);

  return (
    <>
      <button
        onClick={() => setShowTour(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        data-testid="tour-trigger"
      >
        <span>🎯</span>
        Take Product Tour
      </button>
      
      <ProductTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        userRole={userRole}
        isFirstLogin={isFirstLogin}
      />
    </>
  );
};

export default ProductTour; 