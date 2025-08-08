// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import { CONSTANTS } from './utils/constants';
import './styles/App.css';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-boundary">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2>Oops! Something went wrong</h2>
        <p>We encountered an unexpected error. Please try refreshing the page.</p>
        
        <div className="error-actions">
          <button 
            onClick={resetErrorBoundary}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-secondary"
          >
            Refresh Page
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Error Details (Development)</summary>
            <pre className="error-stack">{error.message}</pre>
            <pre className="error-stack">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Error logging function
const logErrorToService = (error, errorInfo) => {
  // In production, you would send this to your error tracking service
  console.error('Application Error:', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  // Example: Send to error tracking service
  /*
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, LogRocket, or other error tracking service
    // errorTrackingService.captureException(error, {
    //   extra: errorInfo,
    //   tags: {
    //     component: 'React App',
    //     version: process.env.REACT_APP_VERSION
    //   }
    // });
  }
  */
};

// Performance monitoring
if (process.env.NODE_ENV === 'production') {
  // Report web vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

// Check if browser supports required features
const checkBrowserCompatibility = () => {
  const requiredFeatures = [
    'fetch',
    'Promise',
    'Map',
    'Set'
  ];
  
  const missingFeatures = requiredFeatures.filter(feature => !(feature in window));
  
  if (missingFeatures.length > 0) {
    const warningDiv = document.createElement('div');
    warningDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #fee2e2;
        border-bottom: 2px solid #fecaca;
        padding: 12px;
        text-align: center;
        z-index: 10000;
        font-family: system-ui, sans-serif;
        color: #991b1b;
      ">
        <strong>Browser Compatibility Warning:</strong>
        Your browser may not support all features. Please consider updating to a modern browser.
        <button onclick="this.parentElement.remove()" style="margin-left: 10px; padding: 4px 8px;">×</button>
      </div>
    `;
    document.body.appendChild(warningDiv);
  }
};

// Initialize app
const initializeApp = () => {
  checkBrowserCompatibility();
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={logErrorToService}
        onReset={() => {
          // Clear any cached state or reload the page
          window.location.reload();
        }}
      >
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Development tools
if (process.env.NODE_ENV === 'development') {
  // React DevTools detection
  if (
    typeof window !== 'undefined' &&
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ &&
    typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE === 'function'
  ) {
    try {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(initializeApp);
    } catch (e) {
      console.error('React DevTools error:', e);
      initializeApp();
    }
  } else {
    initializeApp();
  }
  
  // Development warnings
  console.log(`
    🚀 TourWithAI Development Mode
    ─────────────────────────────
    App Version: ${CONSTANTS.APP_VERSION}
    API Base URL: ${process.env.REACT_APP_API_BASE_URL}
    Environment: ${process.env.NODE_ENV}
    
    Available Commands:
    - window.debugApp() - App debugging info
    - window.clearCache() - Clear application cache
  `);
  
  // Development helper functions
  window.debugApp = () => {
    console.log('App Debug Info:', {
      constants: CONSTANTS,
      environment: process.env,
      performance: performance.now(),
      memory: navigator.memory ? {
        used: Math.round(navigator.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(navigator.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(navigator.memory.jsHeapSizeLimit / 1024 / 1024)
      } : 'Not available'
    });
  };
  
  window.clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    console.log('Cache cleared!');
  };
} else {
  initializeApp();
}

// App metadata
console.log(`
🗺️ TourWithAI v${CONSTANTS.APP_VERSION}
${CONSTANTS.APP_TAGLINE}

Built with ❤️ for travelers exploring South India
`);

export default App;