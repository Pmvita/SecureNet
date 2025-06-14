import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          An unexpected error occurred in this component. This could be due to a network issue, 
          data corruption, or a bug in the application.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Error Details (Development)
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs text-red-600 dark:bg-gray-800 dark:text-red-400">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
          >
            Reload Page
          </button>
        </div>
        
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          If this error persists, please contact support with the error details above.
        </p>
      </div>
    </div>
  );
} 