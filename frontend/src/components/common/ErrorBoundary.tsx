import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>Something went wrong</h1>
            <p>We apologize for the inconvenience. Please try refreshing the page.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
          <style>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              background: var(--bg-primary);
            }

            .error-content {
              max-width: 600px;
              text-align: center;
              padding: 2rem;
              background: var(--bg-secondary);
              border-radius: 0.5rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            h1 {
              color: var(--error);
              margin-bottom: 1rem;
            }

            p {
              color: var(--text-secondary);
              margin-bottom: 1.5rem;
            }

            .error-details {
              margin: 1.5rem 0;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              color: var(--text-secondary);
              margin-bottom: 0.5rem;
            }

            .error-details pre {
              background: var(--bg-primary);
              padding: 1rem;
              border-radius: 0.25rem;
              overflow-x: auto;
              font-size: 0.875rem;
              color: var(--error);
            }

            .retry-button {
              background: var(--primary-color);
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.25rem;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            }

            .retry-button:hover {
              background: var(--primary-color-dark);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
} 