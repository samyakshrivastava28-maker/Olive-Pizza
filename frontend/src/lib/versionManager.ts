import { create } from 'zustand';

export const APP_VERSION = __APP_VERSION__;

interface VersionState {
  isUpdateAvailable: boolean;
  updateMode: 'optional' | 'recommended' | 'required' | null;
  latestVersion: string | null;
  releaseNotes: string | null;
  isUpdating: boolean;
  updateProgress: string;
  setUpdateAvailable: (available: boolean, mode: string, latestVersion: string, notes?: string) => void;
  setUpdating: (updating: boolean, progress?: string) => void;
}

export const useVersionStore = create<VersionState>((set) => ({
  isUpdateAvailable: false,
  updateMode: null,
  latestVersion: null,
  releaseNotes: null,
  isUpdating: false,
  updateProgress: '',
  setUpdateAvailable: (available, mode, latestVersion, notes) => 
    set({ isUpdateAvailable: available, updateMode: mode as any, latestVersion, releaseNotes: notes || null }),
  setUpdating: (updating, progress) => set({ isUpdating: updating, updateProgress: progress || '' }),
}));

import { Capacitor } from '@capacitor/core';

export function initVersionManager() {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [resource, config] = args;
    
    // Only add X-App-Version header to internal API requests to avoid CORS issues with third-party APIs
    let newConfig = config;
    const urlString = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
    
    if (urlString.startsWith('/') || urlString.startsWith(window.location.origin)) {
      const headers = new Headers((config?.headers as any) || {});
      headers.set('X-App-Version', APP_VERSION);
      headers.set('X-Platform', 'web');

      newConfig = {
        ...config,
        headers
      };
    }

    const response = await originalFetch(resource, newConfig);

    if (response.status === 426) {
      try {
        const data = await response.clone().json();
        useVersionStore.getState().setUpdateAvailable(true, data.updateMode || 'required', data.latestVersion);
      } catch (e) {
        useVersionStore.getState().setUpdateAvailable(true, 'required', 'Unknown');
      }
    }

    return response;
  };

  // Listen for trigger-pwa-update global events
  window.addEventListener('trigger-pwa-update', () => {
    performUpdate();
  });

  // Add event listeners for resume/online
  window.addEventListener('online', checkVersion);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  });

  // Check every 5 minutes in the background
  setInterval(() => {
    checkVersion();
  }, 5 * 60 * 1000);

  // Check immediately
  checkVersion();
}

export async function checkVersion() {
  try {
    const laterTimestamp = sessionStorage.getItem('update_later_timestamp');
    if (laterTimestamp) {
      const timePassed = Date.now() - parseInt(laterTimestamp, 10);
      if (timePassed < 30 * 60 * 1000) {
        // Less than 30 minutes since user clicked 'Later', ignore non-critical updates
      }
    }

    const res = await fetch('/api/version/settings');
    if (res.ok) {
      const data = await res.json();
      const current = parseFloat(APP_VERSION);
      const min = parseFloat(data.minimum_version);
      const latest = parseFloat(data.latest_version);

      if (current < min || current < latest) {
        useVersionStore.getState().setUpdateAvailable(true, current < min ? 'required' : 'optional', data.latest_version);
      }
    }
  } catch (error) {
    console.error('Failed to check version:', error);
  }
}

export async function performUpdate() {
  const DOWNLOAD_URL = 'https://github.com/samyakshrivastava28-maker/Olive-Pizza/releases/latest';

  try {
    // 1. Direct user to GitHub latest release download site
    if (Capacitor.isNativePlatform()) {
      window.open(DOWNLOAD_URL, '_system');
      window.open('/api/github/download-apk', '_system');
    } else {
      window.open(DOWNLOAD_URL, '_blank');
    }

    // 2. Unregister service workers and clear caches
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await registration.unregister().catch(() => {});
      }
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      for (let key of cacheKeys) {
        await caches.delete(key);
      }
    }

    // Save current path to restore session
    sessionStorage.setItem('restore_path', window.location.pathname);

    setTimeout(() => {
      window.location.reload();
    }, 1200);

  } catch (error) {
    console.error('Update failed:', error);
    window.location.href = DOWNLOAD_URL;
  }
}
