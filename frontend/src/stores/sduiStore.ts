import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
  SDUISection,
  HomepageConfig,
  ThemeConfig,
  NavigationConfig,
  FooterConfig,
  AnnouncementItem,
  CampaignItem,
  VersionSnapshot,
  SDUIAnalyticsEvent
} from '../types/sdui.types';

export const DEFAULT_SECTIONS: SDUISection[] = [
  { id: 'hero', type: 'hero', label: 'Hero Banner', subtitle: 'Main visual highlight', isVisible: true, order: 0, responsive: { mobile: true, tablet: true, desktop: true }, config: {}, isLocked: true },
  { id: 'categories', type: 'categories', label: 'Menu Categories', subtitle: 'Explore our delicious pizza menu', isVisible: true, order: 1, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
  { id: 'coupons', type: 'coupons', label: 'Active Coupons', subtitle: 'Exclusive discounts and promo codes', isVisible: true, order: 2, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
  { id: 'ads', type: 'ads', label: 'Promotional Advertisements', subtitle: 'Featured deals and video banners', isVisible: true, order: 3, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
  { id: 'best_sellers', type: 'best_sellers', label: 'Best Sellers', subtitle: 'Most popular customer choices', isVisible: true, order: 4, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
  { id: 'recommendations', type: 'recommendations', label: 'AI Recommendations', subtitle: 'Tailored for your taste', isVisible: true, order: 5, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
  { id: 'testimonials', type: 'testimonials', label: 'Customer Reviews', subtitle: 'Loved by thousands of foodies', isVisible: true, order: 6, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
  { id: 'download_app', type: 'download_app', label: 'Download Olive Pizza App', subtitle: 'Get special app-only rewards', isVisible: true, order: 7, responsive: { mobile: true, tablet: true, desktop: true }, config: {} },
];

export const DEFAULT_THEME: ThemeConfig = {
  version: 1,
  mode: 'dark',
  colors: {
    primary: '#f97316',
    secondary: '#ea580c',
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
  cards: {
    style: 'glass',
  },
  effects: {
    glassmorphism: true,
    animations: 'smooth',
    animationSpeed: 1.0,
    blur: '12px',
    shadowIntensity: '0.4',
  },
};

export const DEFAULT_NAVIGATION: NavigationConfig = {
  version: 1,
  header: {
    logoPosition: 'left',
    links: [
      { id: 'nav_menu', label: 'Menu', path: '/menu', visibility: 'public' },
      { id: 'nav_offers', label: 'Offers', path: '/offers', visibility: 'public' },
      { id: 'nav_about', label: 'About Us', path: '/about', visibility: 'public' },
      { id: 'nav_contact', label: 'Contact', path: '/contact', visibility: 'public' },
    ],
    isSticky: true,
    showSearch: true,
  },
  bottomNav: {
    items: [
      { id: 'bnav_home', label: 'Home', path: '/', icon: 'Home', visibility: 'public' },
      { id: 'bnav_menu', label: 'Menu', path: '/menu', icon: 'Utensils', visibility: 'public' },
      { id: 'bnav_cart', label: 'Cart', path: '/cart', icon: 'ShoppingBag', visibility: 'public' },
      { id: 'bnav_orders', label: 'Orders', path: '/orders', icon: 'Receipt', visibility: 'public' },
      { id: 'bnav_profile', label: 'Profile', path: '/profile', icon: 'User', visibility: 'public' },
    ],
    showBadges: true,
  },
};

export const DEFAULT_FOOTER: FooterConfig = {
  version: 1,
  companyName: 'Olive Pizza Inc.',
  tagline: 'Freshly baked artisanal pizzas delivered hot to your doorstep.',
  copyrightText: '© 2026 Olive Pizza. All rights reserved.',
  contactPhone: '+1 (800) 555-PIZZA',
  contactEmail: 'support@olivepizza.com',
  address: '123 Gourmet Way, Culinary City',
  links: [
    { heading: 'Quick Links', items: [{ label: 'Full Menu', url: '/menu' }, { label: 'Track Order', url: '/track-order' }] },
    { heading: 'Support & Help', items: [{ label: 'FAQ', url: '/faq' }, { label: 'Contact Us', url: '/contact' }, { label: 'Privacy Policy', url: '/privacy' }] },
  ],
  socialLinks: [
    { platform: 'Instagram', url: 'https://instagram.com/olivepizza', icon: 'Camera' },
    { platform: 'Facebook', url: 'https://facebook.com/olivepizza', icon: 'Share2' },
  ],
  showMap: false,
  paymentIcons: ['Visa', 'Mastercard', 'UPI', 'ApplePay'],
  partners: ['Swiggy', 'Zomato'],
  showDeveloperCredit: true,
};

export interface SDUIState {
  homepage: HomepageConfig;
  draftHomepage: HomepageConfig | null;
  theme: ThemeConfig;
  navigation: NavigationConfig;
  footer: FooterConfig;
  announcements: AnnouncementItem[];
  campaigns: CampaignItem[];
  versions: VersionSnapshot[];
  analyticsEvents: SDUIAnalyticsEvent[];
  isLoading: boolean;
  isSubscribed: boolean;
  hasDraft: boolean;

  // History & Undo / Redo / Reset
  pastHistory: HomepageConfig[];
  futureHistory: HomepageConfig[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  resetToDefault: () => Promise<void>;

  // Actions
  subscribe: () => () => void;
  injectThemeVariables: (theme: ThemeConfig) => void;
  saveDraft: (homepage: HomepageConfig, skipHistoryPush?: boolean) => Promise<void>;
  publish: (changelog?: string, publishedBy?: string) => Promise<void>;
  discardDraft: () => Promise<void>;
  restoreVersion: (versionId: string, restoredBy?: string) => Promise<void>;
  updateTheme: (theme: ThemeConfig) => Promise<void>;
  updateNavigation: (nav: NavigationConfig) => Promise<void>;
  updateFooter: (footer: FooterConfig) => Promise<void>;
  updateAnnouncements: (announcements: AnnouncementItem[]) => Promise<void>;
  updateCampaigns: (campaigns: CampaignItem[]) => Promise<void>;
  trackEvent: (event: Omit<SDUIAnalyticsEvent, 'timestamp'>) => void;
}

export const useSDUIStore = create<SDUIState>((set, get) => {
  let unsubscribes: Array<() => void> = [];

  const injectThemeVariables = (theme: ThemeConfig) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (theme.colors) {
      root.style.setProperty('--color-primary', theme.colors.primary);
      root.style.setProperty('--color-secondary', theme.colors.secondary || theme.colors.primary);
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

    if (theme.effects) {
      root.style.setProperty('--blur-strength', theme.effects.blur || '12px');
      root.style.setProperty('--anim-speed', `${theme.effects.animationSpeed || 1}s`);
    }
  };

  return {
    homepage: { version: 1, sections: DEFAULT_SECTIONS },
    draftHomepage: null,
    theme: DEFAULT_THEME,
    navigation: DEFAULT_NAVIGATION,
    footer: DEFAULT_FOOTER,
    announcements: [],
    campaigns: [],
    versions: [],
    analyticsEvents: [],
    isLoading: true,
    isSubscribed: false,
    hasDraft: false,

    pastHistory: [],
    futureHistory: [],
    canUndo: false,
    canRedo: false,

    injectThemeVariables,

    subscribe: () => {
      if (get().isSubscribed) return () => {};

      // 1. Homepage listener
      const unsubHome = onSnapshot(
        doc(db, 'website', 'homepage'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as HomepageConfig;
            set({ homepage: data, isLoading: false });
          } else {
            setDoc(doc(db, 'website', 'homepage'), { version: 1, sections: DEFAULT_SECTIONS }).catch(() => {});
            set({ homepage: { version: 1, sections: DEFAULT_SECTIONS }, isLoading: false });
          }
        },
        () => set({ isLoading: false })
      );

      // 2. Draft listener
      const unsubDraft = onSnapshot(
        doc(db, 'website', 'drafts'),
        (snapshot) => {
          if (snapshot.exists() && snapshot.data()?.homepage) {
            set({ draftHomepage: snapshot.data().homepage as HomepageConfig, hasDraft: true });
          } else {
            set({ draftHomepage: null, hasDraft: false });
          }
        },
        () => {}
      );

      // 3. Theme listener
      const unsubTheme = onSnapshot(
        doc(db, 'website', 'theme'),
        (snapshot) => {
          if (snapshot.exists()) {
            const themeData = snapshot.data() as ThemeConfig;
            set({ theme: themeData });
            injectThemeVariables(themeData);
          } else {
            injectThemeVariables(DEFAULT_THEME);
          }
        },
        () => injectThemeVariables(DEFAULT_THEME)
      );

      // 4. Navigation listener
      const unsubNav = onSnapshot(
        doc(db, 'website', 'navigation'),
        (snapshot) => {
          if (snapshot.exists()) set({ navigation: snapshot.data() as NavigationConfig });
        },
        () => {}
      );

      // 5. Footer listener
      const unsubFooter = onSnapshot(
        doc(db, 'website', 'footer'),
        (snapshot) => {
          if (snapshot.exists()) set({ footer: snapshot.data() as FooterConfig });
        },
        () => {}
      );

      // 6. Announcement listener
      const unsubAnn = onSnapshot(
        doc(db, 'website', 'announcement'),
        (snapshot) => {
          if (snapshot.exists()) set({ announcements: snapshot.data()?.items || [] });
        },
        () => {}
      );

      // 7. Campaign listener
      const unsubCamp = onSnapshot(
        doc(db, 'website', 'campaigns'),
        (snapshot) => {
          if (snapshot.exists()) set({ campaigns: snapshot.data()?.items || [] });
        },
        () => {}
      );

      unsubscribes = [unsubHome, unsubDraft, unsubTheme, unsubNav, unsubFooter, unsubAnn, unsubCamp];
      set({ isSubscribed: true });

      return () => {
        unsubscribes.forEach((fn) => fn());
        unsubscribes = [];
        set({ isSubscribed: false });
      };
    },

    saveDraft: async (homepageConfig, skipHistoryPush = false) => {
      if (!skipHistoryPush) {
        const current = get().draftHomepage || get().homepage;
        const past = get().pastHistory;
        if (current && JSON.stringify(current.sections) !== JSON.stringify(homepageConfig.sections)) {
          const updatedPast = [...past, current].slice(-30);
          set({ pastHistory: updatedPast, futureHistory: [], canUndo: true, canRedo: false });
        }
      }

      await setDoc(doc(db, 'website', 'drafts'), {
        homepage: homepageConfig,
        updatedAt: new Date().toISOString(),
      });
      set({ draftHomepage: homepageConfig, hasDraft: true });
    },

    undo: async () => {
      const { pastHistory, futureHistory, draftHomepage, homepage, saveDraft } = get();
      if (pastHistory.length === 0) return;

      const current = draftHomepage || homepage;
      const previous = pastHistory[pastHistory.length - 1];
      const newPast = pastHistory.slice(0, pastHistory.length - 1);
      const newFuture = [current, ...futureHistory];

      set({ pastHistory: newPast, futureHistory: newFuture, canUndo: newPast.length > 0, canRedo: true });
      await saveDraft(previous, true);
    },

    redo: async () => {
      const { pastHistory, futureHistory, draftHomepage, homepage, saveDraft } = get();
      if (futureHistory.length === 0) return;

      const current = draftHomepage || homepage;
      const next = futureHistory[0];
      const newFuture = futureHistory.slice(1);
      const newPast = [...pastHistory, current];

      set({ pastHistory: newPast, futureHistory: newFuture, canUndo: true, canRedo: newFuture.length > 0 });
      await saveDraft(next, true);
    },

    resetToDefault: async () => {
      const defaultConfig: HomepageConfig = { version: 1, sections: DEFAULT_SECTIONS };

      await setDoc(doc(db, 'website', 'homepage'), defaultConfig);
      await setDoc(doc(db, 'website', 'drafts'), { homepage: null });
      await setDoc(doc(db, 'website', 'theme'), DEFAULT_THEME);
      await setDoc(doc(db, 'website', 'navigation'), DEFAULT_NAVIGATION);
      await setDoc(doc(db, 'website', 'footer'), DEFAULT_FOOTER);

      set({
        homepage: defaultConfig,
        draftHomepage: null,
        theme: DEFAULT_THEME,
        navigation: DEFAULT_NAVIGATION,
        footer: DEFAULT_FOOTER,
        hasDraft: false,
        pastHistory: [],
        futureHistory: [],
        canUndo: false,
        canRedo: false,
      });

      injectThemeVariables(DEFAULT_THEME);
    },

    publish: async (changelog = 'Published website layout updates', publishedBy = 'Owner') => {
      const currentDraft = get().draftHomepage || get().homepage;
      const newVersion = (get().homepage.version || 1) + 1;
      const nextConfig: HomepageConfig = {
        ...currentDraft,
        version: newVersion,
        publishedAt: new Date().toISOString(),
        publishedBy,
        changelog,
      };

      const snapshot: VersionSnapshot = {
        id: `v${newVersion}_${Date.now()}`,
        version: newVersion,
        timestamp: new Date().toISOString(),
        publishedBy,
        changelog,
        homepage: nextConfig,
        theme: get().theme,
        navigation: get().navigation,
        footer: get().footer,
      };
      await addDoc(collection(db, 'website_versions'), snapshot);

      await setDoc(doc(db, 'website', 'homepage'), nextConfig);
      await setDoc(doc(db, 'website', 'drafts'), { homepage: null });
      set({ homepage: nextConfig, draftHomepage: null, hasDraft: false });
    },

    discardDraft: async () => {
      await setDoc(doc(db, 'website', 'drafts'), { homepage: null });
      set({ draftHomepage: null, hasDraft: false });
    },

    restoreVersion: async (versionId, restoredBy = 'Owner') => {
      const q = query(collection(db, 'website_versions'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const targetDoc = snap.docs.find((d) => d.id === versionId || d.data().id === versionId);
      if (!targetDoc) return;

      const data = targetDoc.data() as VersionSnapshot;
      if (data.homepage) {
        await get().saveDraft(data.homepage);
        await get().publish(`Rollback to version ${data.version}`, restoredBy);
      }
    },

    updateTheme: async (newTheme) => {
      await setDoc(doc(db, 'website', 'theme'), newTheme);
      set({ theme: newTheme });
      injectThemeVariables(newTheme);
    },

    updateNavigation: async (newNav) => {
      await setDoc(doc(db, 'website', 'navigation'), newNav);
      set({ navigation: newNav });
    },

    updateFooter: async (newFooter) => {
      await setDoc(doc(db, 'website', 'footer'), newFooter);
      set({ footer: newFooter });
    },

    updateAnnouncements: async (newItems) => {
      await setDoc(doc(db, 'website', 'announcement'), { items: newItems });
      set({ announcements: newItems });
    },

    updateCampaigns: async (newCampaigns) => {
      await setDoc(doc(db, 'website', 'campaigns'), { items: newCampaigns });
      set({ campaigns: newCampaigns });
    },

    trackEvent: (event) => {
      const fullEvent: SDUIAnalyticsEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ analyticsEvents: [fullEvent, ...state.analyticsEvents].slice(0, 200) }));
    },
  };
});
