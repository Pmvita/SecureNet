import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: { componentStack?: string }) => {
    // Log error to monitoring service (Sentry, etc.)
    console.error('Application Error:', error);
    if (errorInfo.componentStack) {
      console.error('Component Stack:', errorInfo.componentStack);
    }
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  };

  const handleReset = () => {
    // Clear any error state or reload data
    window.location.reload();
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  );
} 