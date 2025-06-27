import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

// Initialize the React application
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

// Error boundary for the entire app
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ElectronX: React Error Boundary caught an error:', error, errorInfo);
    
    // Report error to main process if available
    if (window.electronAPI) {
      window.electronAPI.invoke('app:log-error', {
        error: error.message,
        stack: error.stack,
        errorInfo
      }).catch(console.error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>ElectronX encountered an unexpected error.</p>
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
            <button 
              onClick={() => window.location.reload()}
              className="error-reload-btn"
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

// Performance monitoring
const startTime = performance.now();

// Render the application
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);

// Log startup performance
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  console.log(`ElectronX: Renderer startup time: ${loadTime.toFixed(2)}ms`);
  
  if (window.electronAPI) {
    window.electronAPI.invoke('app:log-performance', {
      metric: 'renderer-startup',
      duration: loadTime
    }).catch(console.error);
  }
});

// Handle window lifecycle events
window.addEventListener('beforeunload', () => {
  console.log('ElectronX: Renderer process shutting down...');
});

// Development mode helpers
if (process.env.NODE_ENV === 'development') {
  // Enable React DevTools
  if (typeof window !== 'undefined') {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
      supportsFiber: true
    };
  }
  
  // Hot reload support
  if ((module as any).hot) {
    (module as any).hot.accept('./App', () => {
      const NextApp = require('./App').App;
      root.render(
        <React.StrictMode>
          <AppErrorBoundary>
            <NextApp />
          </AppErrorBoundary>
        </React.StrictMode>
      );
    });
  }
}