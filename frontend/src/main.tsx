import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App.tsx';

import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { validateEnvironment } from './lib/envValidator';
import { initCrashLogger } from './lib/crashLogger';

// 1. Init crash logger FIRST — must suppress non-fatal rejections before anything else runs
initCrashLogger();

// 1.1 Silence non-error console logs in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {}; // optionally keep warn or silence it; typically we silence warn too unless debugging.
}

// 1.5. Patch global fetch to route /api/ to the backend on Capacitor/Native apps
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://olive-pizza-backend.onrender.com');
    resource = `${backendUrl}${resource}`;
  }
  return originalFetch(resource, config);
};

// 2. Validate env vars (logs warnings only, never throws)
validateEnvironment();

// 3. Lazy-start version manager to not block initial render
import('./lib/versionManager').then(({ initVersionManager }) => {
  try { initVersionManager(); } catch { /* non-fatal */ }
}).catch(() => { /* non-fatal if versionManager fails to load */ });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalErrorBoundary>
  </StrictMode>,
);
