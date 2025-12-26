import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Initialize Sentry for error monitoring
// Get your DSN from: https://sentry.io -> Create Project -> React
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '', // Add VITE_SENTRY_DSN to your env vars
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // Only enable in production
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
});

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fix: Explicitly extend Component and declare state to resolve type issues
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Report to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '20px' }}>
          <div style={{ maxWidth: '600px', width: '100%', backgroundColor: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <h1 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Something went wrong</h1>
            <p style={{ color: '#374151', marginBottom: '24px' }}>The application encountered an error and could not load.</p>

            <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', overflow: 'auto', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
              <pre style={{ fontSize: '14px', fontFamily: 'monospace', color: '#1f2937' }}>
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Import RoleProvider dynamically to avoid circular dependencies
import { RoleProvider } from './contexts/RoleContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RoleProvider>
          <App />
          {/* Vercel Analytics - tracks page views automatically */}
          <Analytics />
        </RoleProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);