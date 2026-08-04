import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';

export interface Section {
  id: string;
  type: string;
  isVisible: boolean;
  order: number;
  label: string;
  config: Record<string, any>;
  isLocked?: boolean;
  isProtected?: boolean;
}

export interface HomepageConfig {
  publishedAt?: string | null;
  publishedBy?: string | null;
  version: number;
  sections: Section[];
  changelog?: string;
}

export interface ThemeConfig {
  publishedAt?: string | null;
  version: number;
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  effects: {
    glassmorphism: boolean;
    neumorphism: boolean;
    animations: 'smooth' | 'snappy' | 'subtle' | 'off';
    animationSpeed: number;
    blur: string;
    shadowIntensity: string;
  };
  mode: 'dark' | 'light' | 'system' | 'scheduled';
  spacing: 'compact' | 'comfortable' | 'spacious';
  cardStyle: 'glass' | 'solid' | 'outline' | 'minimal' | 'elevated' | '3d';
  seasonalTheme?: string | null;
}

export interface NavigationConfig {
  publishedAt?: string | null;
  version: number;
  header: {
    logoUrl?: string;
    logoPosition: 'left' | 'center';
    links: Array<{ id: string; label: string; path: string; visibility: string; badge?: string }>;
    ctaButton?: { label: string; link: string; style: string; isVisible: boolean };
    style: string;
    height: string;
    isSticky: boolean;
    showSearch: boolean;
  };
  bottomNav: {
    items: Array<{ id: string; label: string; path: string; icon?: string; visibility: string }>;
    showBadges: boolean;
  };
  footer: {
    columns: Array<{ heading: string; links: Array<{ label: string; url: string }> }>;
    socialLinks: Array<{ platform: string; url: string; icon: string }>;
    copyrightText: string;
    locationText?: string;
    showDeveloperCredit: boolean;
    developerCreditUrl?: string;
  };
}

export interface FeatureFlags {
  [key: string]: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  theme?: any;
  announcement?: any;
}

export interface Announcement {
  id: string;
  isActive: boolean;
  type: string;
  text: string;
  emoji?: string;
  link?: string | null;
  linkText?: string | null;
  backgroundColor: string;
  textColor: string;
  closeable: boolean;
  priority: number;
  targetRoutes: string[];
}

export interface RealtimeSyncLog {
  timestamp: string;
  collection: string;
  docId: string;
  action: 'UPDATE' | 'INIT';
  latencyMs: number;
}

interface WebsiteConfigState {
  homepage: HomepageConfig | null;
  draftHomepage: HomepageConfig | null;
  theme: ThemeConfig | null;
  navigation: NavigationConfig | null;
  featureFlags: FeatureFlags;
  campaigns: Campaign[];
  announcements: Announcement[];
  activeAnnouncement: Announcement | null;
  isLoading: boolean;
  error: string | null;
  syncLogs: RealtimeSyncLog[];
  isSubscribed: boolean;

  // Actions
  subscribe: () => () => void;
  injectThemeVariables: (theme: ThemeConfig) => void;
  dismissAnnouncement: (id: string) => void;
  restartListeners: () => void;
  invalidateCache: () => void;
}

const DEFAULT_HOMEPAGE: HomepageConfig = {
  version: 1,
  sections: [
    { id: 'hero', type: 'hero', isVisible: true, order: 0, label: 'Hero Section', config: {}, isLocked: true },
    { id: 'categories', type: 'categories', isVisible: true, order: 1, label: 'Menu Categories', config: {} },
    { id: 'coupons', type: 'coupons', isVisible: true, order: 2, label: 'Live Coupons', config: {} },
    { id: 'ads', type: 'ads', isVisible: true, order: 3, label: 'Advertisements', config: {} },
    { id: 'recommendations', type: 'recommendations', isVisible: true, order: 4, label: 'Recommendations', config: {} },
    { id: 'download_app', type: 'download_app', isVisible: true, order: 5, label: 'Download App', config: {} },
  ],
};

const DEFAULT_THEME: ThemeConfig = {
  version: 1,
  colors: {
    primary: '#f97316',
    accent: '#fb923c',
    background: '#06070a',
    surface: '#111827',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    border: 'rgba(255,255,255,0.1)',
    success: '#22c55e',
    error: '#ef4444',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    mono: 'JetBrains Mono',
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '20px',
    xl: '32px',
    full: '9999px',
  },
  effects: {
    glassmorphism: true,
    neumorphism: false,
    animations: 'smooth',
    animationSpeed: 1.0,
    blur: '12px',
    shadowIntensity: 'medium',
  },
  mode: 'dark',
  spacing: 'comfortable',
  cardStyle: 'glass',
};

const DEFAULT_FLAGS: FeatureFlags = {
  coupons: { enabled: true, description: 'Live coupon offers' },
  wallet: { enabled: true, description: 'Customer wallet' },
  aiAssistant: { enabled: true, description: 'AI Assistant' },
  voiceAssistant: { enabled: true, description: 'Voice ordering' },
  recommendations: { enabled: true, description: 'Personalized recommendations' },
  tracking: { enabled: true, description: 'Live 3D GPS tracking' },
  reviews: { enabled: true, description: 'Product reviews' },
  darkMode: { enabled: true, description: 'Dark mode' },
};

export const useWebsiteConfigStore = create<WebsiteConfigState>((set, get) => {
  let unsubscribes: Array<() => void> = [];

  const injectThemeVariables = (theme: ThemeConfig) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (theme.colors) {
      root.style.setProperty('--color-primary', theme.colors.primary);
      root.style.setProperty('--color-accent', theme.colors.accent);
      root.style.setProperty('--color-background', theme.colors.background);
      root.style.setProperty('--color-surface', theme.colors.surface);
      root.style.setProperty('--color-text', theme.colors.text);
      root.style.setProperty('--color-text-muted', theme.colors.textMuted);
      root.style.setProperty('--color-border', theme.colors.border);
    }

    if (theme.borderRadius) {
      root.style.setProperty('--radius-sm', theme.borderRadius.sm);
      root.style.setProperty('--radius-md', theme.borderRadius.md);
      root.style.setProperty('--radius-lg', theme.borderRadius.lg);
      root.style.setProperty('--radius-xl', theme.borderRadius.xl);
    }

    if (theme.fonts) {
      root.style.setProperty('--font-heading', theme.fonts.heading);
      root.style.setProperty('--font-body', theme.fonts.body);
    }

    if (theme.effects) {
      root.style.setProperty('--blur-strength', theme.effects.blur || '12px');
      root.style.setProperty('--anim-speed', `${theme.effects.animationSpeed || 1}s`);
    }
  };

  const addSyncLog = (collectionName: string, docId: string, action: 'UPDATE' | 'INIT', start: number) => {
    const latencyMs = Date.now() - start;
    const log: RealtimeSyncLog = {
      timestamp: new Date().toLocaleTimeString(),
      collection: collectionName,
      docId,
      action,
      latencyMs,
    };
    set((state) => ({ syncLogs: [log, ...state.syncLogs].slice(0, 50) }));
  };

  return {
    homepage: DEFAULT_HOMEPAGE,
    draftHomepage: DEFAULT_HOMEPAGE,
    theme: DEFAULT_THEME,
    navigation: null,
    featureFlags: DEFAULT_FLAGS,
    campaigns: [],
    announcements: [],
    activeAnnouncement: null,
    isLoading: true,
    error: null,
    syncLogs: [],
    isSubscribed: false,

    injectThemeVariables,

    subscribe: () => {
      if (get().isSubscribed) return () => {};

      const now = Date.now();

      const fallbackFetchPublic = async () => {
        try {
          const res = await fetch('/api/website-config/homepage');
          if (res.ok) {
            const data = await res.json();
            if (data?.data) {
              set({ homepage: data.data, isLoading: false });
            }
          }
        } catch {
          set({ homepage: DEFAULT_HOMEPAGE, isLoading: false });
        }
      };

      // 1. Homepage config listener
      const unsubHome = onSnapshot(
        doc(db, 'website_config', 'homepage'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as HomepageConfig;
            set({ homepage: data, isLoading: false });
            addSyncLog('website_config', 'homepage', 'UPDATE', now);
          } else {
            set({ homepage: DEFAULT_HOMEPAGE, isLoading: false });
          }
        },
        (err) => {
          set({ isLoading: false });
          fallbackFetchPublic();
        }
      );

      // 2. Draft Homepage listener (For preview & dashboard editor)
      const unsubDraft = onSnapshot(
        doc(db, 'website_config', 'homepage_draft'),
        (snapshot) => {
          if (snapshot.exists()) {
            set({ draftHomepage: snapshot.data() as HomepageConfig });
            addSyncLog('website_config', 'homepage_draft', 'UPDATE', now);
          }
        },
        () => {}
      );

      // 3. Theme config listener
      const unsubTheme = onSnapshot(
        doc(db, 'website_config', 'theme'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as ThemeConfig;
            set({ theme: data });
            injectThemeVariables(data);
            addSyncLog('website_config', 'theme', 'UPDATE', now);
          } else {
            injectThemeVariables(DEFAULT_THEME);
          }
        },
        () => {
          injectThemeVariables(DEFAULT_THEME);
        }
      );

      // 4. Navigation listener
      const unsubNav = onSnapshot(
        doc(db, 'website_config', 'navigation'),
        (snapshot) => {
          if (snapshot.exists()) {
            set({ navigation: snapshot.data() as NavigationConfig });
            addSyncLog('website_config', 'navigation', 'UPDATE', now);
          }
        },
        () => {}
      );

      // 5. Feature flags listener
      const unsubFlags = onSnapshot(
        doc(db, 'website_config', 'feature_flags'),
        (snapshot) => {
          if (snapshot.exists()) {
            set({ featureFlags: snapshot.data() as FeatureFlags });
            addSyncLog('website_config', 'feature_flags', 'UPDATE', now);
          }
        },
        () => {}
      );

      // 6. Active Announcements listener
      const unsubAnn = onSnapshot(
        collection(db, 'announcements'),
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
          const activeList = list.filter((a) => a.isActive);
          const dismissedId = typeof window !== 'undefined' ? window.sessionStorage.getItem('dismissed_announcement') : null;
          const topActive = activeList.find((a) => a.id !== dismissedId) || null;
          set({ announcements: activeList, activeAnnouncement: topActive });
          addSyncLog('announcements', '*', 'UPDATE', now);
        },
        () => {}
      );

      // 7. Active Campaigns listener
      const unsubCamp = onSnapshot(
        collection(db, 'campaigns'),
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
          set({ campaigns: list.filter((c) => c.isActive) });
          addSyncLog('campaigns', '*', 'UPDATE', now);
        },
        () => {}
      );

      unsubscribes = [unsubHome, unsubDraft, unsubTheme, unsubNav, unsubFlags, unsubAnn, unsubCamp];
      set({ isSubscribed: true });

      return () => {
        unsubscribes.forEach((fn) => fn());
        unsubscribes = [];
        set({ isSubscribed: false });
      };
    },

    dismissAnnouncement: (id: string) => {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('dismissed_announcement', id);
      }
      set({ activeAnnouncement: null });
    },

    restartListeners: () => {
      unsubscribes.forEach((fn) => fn());
      unsubscribes = [];
      set({ isSubscribed: false });
      get().subscribe();
    },

    invalidateCache: () => {
      get().restartListeners();
      if (get().theme) injectThemeVariables(get().theme!);
    },
  };
});
