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
