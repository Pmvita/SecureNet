import { ErrorBoundary } from 'react-error-boundary';
import { ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { FallbackProps } from 'react-error-boundary';

interface SecurityErrorFallbackProps extends FallbackProps {
  context?: string;
}

function SecurityErrorFallback({ error, resetErrorBoundary, context }: SecurityErrorFallbackProps) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <ShieldExclamationIcon className="mx-auto h-12 w-12 text-amber-500" />
        <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Security Component Error
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {context ? `Error in ${context}` : 'A security-related component encountered an error'}. 
          This may affect security monitoring capabilities.
        </p>
        
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
        
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Security monitoring may be temporarily impacted
        </p>
      </div>
    </div>
  );
}

interface SecurityErrorBoundaryProps {
  children: React.ReactNode;
  context?: string;
}

export function SecurityErrorBoundary({ children, context }: SecurityErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: any) => {
    // Log security-related errors with special priority
    console.error(`Security Component Error (${context}):`, error);
    if (errorInfo?.componentStack) {
      console.error('Component Stack:', errorInfo.componentStack);
    }
    
    // In production, send to security monitoring
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to security monitoring service
      // SecurityMonitoring.captureSecurityError(error, context);
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={(props) => <SecurityErrorFallback {...props} context={context} />}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
} 