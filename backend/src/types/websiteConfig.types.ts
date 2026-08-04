/**
 * Server-Driven UI (SDUI) Platform & Website Manager Type Definitions
 * Shared across Backend and Frontend with complete developer & owner schemas
 */

export type SectionType =
  | 'hero'
  | 'categories'
  | 'coupons'
  | 'ads'
  | 'recommendations'
  | 'download_app'
  | 'testimonials'
  | 'custom'
  | 'video'
  | 'gallery'
  | 'stats'
  | 'faq'
  | 'timeline'
  | 'bestsellers'
  | 'trending'
  | 'festival';

export interface SectionAnalyticsConfig {
  trackViews?: boolean;
  trackClicks?: boolean;
  trackScrollDepth?: boolean;
}

export interface Section<TConfig = Record<string, any>> {
  id: string;
  type: SectionType;
  isVisible: boolean;
  order: number;
  label: string;
  config: TConfig;
  analytics?: SectionAnalyticsConfig;
  // Developer Platform Controls
  isLocked?: boolean;       // If true, owner cannot modify or delete
  isProtected?: boolean;    // If true, requires developer elevation to modify
  version?: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface HomepageConfig {
  publishedAt?: string | null;
  publishedBy?: string | null;
  version: number;
  sections: Section[];
  changelog?: string;
  isLocked?: boolean;
}

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  error: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

export interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeEffects {
  glassmorphism: boolean;
  neumorphism: boolean;
  animations: 'smooth' | 'snappy' | 'subtle' | 'off';
  animationSpeed: number;
  blur: string;
  shadowIntensity: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'glow';
}

export interface ThemeConfig {
  publishedAt?: string | null;
  version: number;
  colors: ThemeColors;
  fonts: ThemeFonts;
  borderRadius: ThemeBorderRadius;
  effects: ThemeEffects;
  mode: 'dark' | 'light' | 'system' | 'scheduled';
  spacing: 'compact' | 'comfortable' | 'spacious';
  cardStyle: 'glass' | 'solid' | 'outline' | 'minimal' | 'elevated' | '3d';
  seasonalTheme?: 'diwali' | 'christmas' | 'holi' | 'independence' | 'eid' | null;
  seasonalExpiresAt?: string | null;
}

export interface NavLinkItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  visibility: 'all' | 'desktop' | 'mobile' | 'authenticated' | 'guest';
  badge?: string;
  children?: NavLinkItem[];
}

export interface NavigationConfig {
  publishedAt?: string | null;
  version: number;
  header: {
    logoUrl?: string;
    logoPosition: 'left' | 'center';
    links: NavLinkItem[];
    ctaButton?: { label: string; link: string; style: string; isVisible: boolean };
    style: 'transparent' | 'solid' | 'glass' | 'blur';
    height: 'sm' | 'md' | 'lg';
    isSticky: boolean;
    showSearch: boolean;
  };
  bottomNav: {
    items: NavLinkItem[];
    activeColor?: string;
    showBadges: boolean;
  };
  footer: {
    columns: Array<{
      heading: string;
      links: Array<{ label: string; url: string; isExternal?: boolean }>;
    }>;
    socialLinks: Array<{ platform: string; url: string; icon: string }>;
    copyrightText: string;
    locationText?: string;
    showDeveloperCredit: boolean;
    developerCreditUrl?: string;
  };
}

export interface Banner {
  id: string;
  type: 'image' | 'video' | 'offer' | 'festival' | 'countdown';
  label: string;
  imageUrl?: string;
  videoUrl?: string;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaStyle?: 'primary' | 'outline' | 'ghost';
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  animation?: 'slide' | 'fade' | 'zoom' | 'none';
  schedule?: {
    enabled: boolean;
    startAt?: string | null;
    endAt?: string | null;
  };
  priority: number;
  isActive: boolean;
  targetAudience?: 'all' | 'authenticated' | 'guest' | 'new_user';
  countdownTarget?: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'festival' | 'flash_sale' | 'weekend' | 'holiday' | 'custom';
  isActive: boolean;
  schedule?: {
    startAt?: string | null;
    endAt?: string | null;
  };
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    backgroundGradient?: string;
    particleType?: 'fireworks' | 'stars' | 'snowflakes' | 'petals' | 'none';
    overlayPattern?: string | null;
  };
  homepageSections?: string[];
  activateBanners?: string[];
  activateCoupons?: string[];
  overrideTheme?: boolean;
  announcement?: {
    enabled: boolean;
    text: string;
    style: 'scrolling' | 'static';
    backgroundColor: string;
    textColor: string;
  };
}

export interface Announcement {
  id: string;
  isActive: boolean;
  type: 'scrolling' | 'static' | 'banner';
  text: string;
  emoji?: string;
  link?: string | null;
  linkText?: string | null;
  backgroundColor: string;
  textColor: string;
  closeable: boolean;
  priority: number;
  schedule?: {
    startAt?: string | null;
    endAt?: string | null;
  };
  targetRoutes: string[];
  targetAudience: 'all' | 'authenticated' | 'guest';
}

export interface FeatureFlags {
  coupons: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  wallet: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  aiAssistant: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  voiceAssistant: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  recommendations: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  referral: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  reviews: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  tracking: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  notifications: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  socialLogin: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  guestCheckout: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  darkMode: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  offlineMode: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  abTesting: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  betaFeatures: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
  maintenanceMode: { enabled: boolean; description: string; rolloutPercent?: number; isKillSwitched?: boolean };
}

export interface ABTestVariant {
  label: string;
  sectionConfig: any;
  impressions: number;
  clicks: number;
  orders: number;
  revenue?: number;
}

export interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  traffic: number; // 0 to 100 percentage for variant B
  startAt: string;
  endAt?: string | null;
  variants: {
    A: ABTestVariant;
    B: ABTestVariant;
  };
  winner?: 'A' | 'B' | null;
  autoApplyWinner?: boolean;
}

export interface WebsiteVersion {
  versionId: string;
  version: number;
  type: 'homepage' | 'theme' | 'navigation' | 'full';
  publishedAt: string;
  publishedBy: { uid: string; name?: string; email?: string; role?: string };
  changelog?: string;
  snapshot: {
    homepage?: HomepageConfig;
    theme?: ThemeConfig;
    navigation?: NavigationConfig;
    featureFlags?: FeatureFlags;
    announcements?: Announcement[];
    campaigns?: Campaign[];
  };
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'lottie' | 'svg' | 'pdf';
  name: string;
  url: string;
  thumbnailUrl?: string;
  folder: string;
  tags: string[];
  width?: number;
  height?: number;
  sizeBytes?: number;
  format?: string;
  uploadedBy?: string;
  uploadedAt: string;
  usedIn?: string[];
}

export interface RolePermissions {
  websiteManager: boolean;
  homepageBuilder: boolean;
  themeManager: boolean;
  navigationBuilder: boolean;
  bannerManager: boolean;
  campaignManager: boolean;
  featureFlags: boolean;
  analytics: boolean;
  abTesting: boolean;
  versionHistory: boolean;
  permissionsManager: boolean;
  mediaLibrary: boolean;
  publish: boolean;
  rollback: boolean;
  rawJsonEditor?: boolean;
  sectionLocking?: boolean;
}

export interface WebsiteAnalyticsEvent {
  eventType: 'section_view' | 'section_click' | 'section_scroll_50' | 'section_scroll_100' | 'cta_click' | 'product_click' | 'banner_click' | 'web_vital';
  sectionId?: string;
  sectionType?: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}
