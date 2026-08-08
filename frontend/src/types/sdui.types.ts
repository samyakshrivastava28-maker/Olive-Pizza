export type SectionType =
  | 'categories'
  | 'coupons'
  | 'ads'
  | 'hero'
  | 'gallery'
  | 'testimonials'
  | 'video'
  | 'faq'
  | 'best_sellers'
  | 'trending'
  | 'recommendations'
  | 'download_app'
  | 'timeline'
  | 'stats'
  | 'blogs'
  | 'contact'
  | 'maps'
  | 'instagram'
  | 'custom_html'
  | 'custom_react'
  | 'blank';

// ─── Olive Studio v2 Types ──────────────────────────────────────────────────

export type AnimationPresetName =
  | 'none'
  | 'fade_up'
  | 'fade_down'
  | 'slide_left'
  | 'slide_right'
  | 'zoom_in'
  | 'zoom_out'
  | 'bounce'
  | 'elastic'
  | 'flip_x'
  | 'flip_y'
  | 'rotate_in'
  | 'float'
  | 'pulse'
  | 'luxury'
  | 'apple'
  | 'spring';

export type AnimationTrigger = 'on_scroll' | 'on_load' | 'on_hover' | 'on_click';
export type AnimationEasing = 'spring' | 'ease-in-out' | 'ease-out' | 'linear' | 'bounce';

export interface AnimationPreset {
  name: AnimationPresetName;
  trigger: AnimationTrigger;
  duration: number;       // ms
  delay: number;          // ms
  easing: AnimationEasing;
  repeat: boolean;
}

export interface AIDesignScore {
  overall: number;        // 0-100
  spacing: number;
  typography: number;
  accessibility: number;
  performance: number;
  conversions: number;
  seo: number;
  responsiveness: number;
  suggestions: AISuggestion[];
  generatedAt: string;
}

export interface AISuggestion {
  id: string;
  sectionId?: string;
  type: 'spacing' | 'typography' | 'color' | 'cta' | 'accessibility' | 'image' | 'layout';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  autoFixable: boolean;
  fix?: Partial<SDUISection>;
}

export interface SectionVariant {
  id: string;
  name: string;
  emoji: string;
  category: ComponentCategory;
  description: string;
  thumbnail?: string;
  defaultConfig: Record<string, any>;
  defaultStyle?: Partial<SectionStyle>;
  type: SectionType;
  premium?: boolean;
}

export type ComponentCategory =
  | 'hero'
  | 'categories'
  | 'products'
  | 'coupons'
  | 'testimonials'
  | 'gallery'
  | 'contact'
  | 'social'
  | 'stats'
  | 'story'
  | 'chef'
  | 'app_download'
  | 'faq'
  | 'campaigns'
  | 'custom';

export interface CanvasSelection {
  sectionId: string | null;
  editingField: string | null;       // which inline field is active
  floatingToolbarPos?: { x: number; y: number };
}

export interface HeatmapPoint {
  sectionId: string;
  attention: number;      // 0-100
  clickProbability: number;
  scrollDepth: number;
  ctaScore: number;
}

export interface AIGenerationVersion {
  id: string;
  label: string;            // "Version A", "Version B" etc.
  prompt: string;
  sections: SDUISection[];
  score?: AIDesignScore;
  generatedAt: string;
  stitchStatus?: any;
}

export interface ResponsiveConfig {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

export interface ScheduleConfig {
  isScheduled: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SectionStyle {
  bgType?: 'none' | 'color' | 'gradient' | 'glass' | 'image';
  bgColor?: string;
  bgGradient?: string;
  bgImage?: string;
  glassBlur?: string;
  padding?: string;
  margin?: string;
  shadow?: string;
  borderRadius?: string;
  columns?: number;
  rows?: number;
  animation?: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
  textColor?: string;
  // Olive Studio v2 extensions
  opacity?: number;
  transform?: string;
  zIndex?: number;
  blendMode?: string;
}

export interface SDUISection {
  id: string;
  type: SectionType;
  label: string;
  subtitle?: string;
  isVisible: boolean;
  order: number;
  responsive?: ResponsiveConfig;
  schedule?: ScheduleConfig;
  style?: SectionStyle;
  config: Record<string, any>;
  isLocked?: boolean;
  isProtected?: boolean;
  // ─── Olive Studio v2 ───────────────────────────
  animationPreset?: AnimationPreset;
  aiScore?: number;             // 0-100, section-level design quality
  editableFields?: string[];    // keys of config that are inline-editable
  variantId?: string;           // component library variant reference
  studioMeta?: {
    addedAt?: string;
    lastEditedAt?: string;
    generatedByAI?: boolean;
    stitchId?: string;
  };
}

export interface HomepageConfig {
  version: number;
  sections: SDUISection[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  changelog?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  error: string;
}

export interface ThemeConfig {
  version: number;
  mode: 'dark' | 'light' | 'system';
  colors: ThemeColors;
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
  cards: {
    style: 'glass' | 'solid' | 'outline' | 'minimal' | 'elevated' | '3d';
  };
  effects: {
    glassmorphism: boolean;
    animations: 'smooth' | 'snappy' | 'subtle' | 'off';
    animationSpeed: number;
    blur: string;
    shadowIntensity: string;
  };
}

export interface NavigationConfig {
  version: number;
  header: {
    logoUrl?: string;
    logoPosition: 'left' | 'center';
    links: Array<{ id: string; label: string; path: string; visibility: string; badge?: string }>;
    isSticky: boolean;
    showSearch: boolean;
  };
  bottomNav: {
    items: Array<{ id: string; label: string; path: string; icon?: string; visibility: string }>;
    showBadges: boolean;
  };
}

export interface FooterConfig {
  version: number;
  companyName: string;
  tagline: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  links: Array<{ heading: string; items: Array<{ label: string; url: string }> }>;
  socialLinks: Array<{ platform: string; url: string; icon: string }>;
  copyrightText: string;
  showMap: boolean;
  paymentIcons: string[];
  partners: string[];
  showDeveloperCredit: boolean;
  developerCreditUrl?: string;
}

export interface AnnouncementItem {
  id: string;
  type: 'free_delivery' | 'festival' | 'offer' | 'maintenance' | 'holiday' | 'custom';
  title: string;
  text: string;
  emoji?: string;
  link?: string;
  linkText?: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  priority?: number;
}

export interface CampaignItem {
  id: string;
  name: string;
  type: 'diwali' | 'christmas' | 'new_year' | 'weekend_sale' | 'pizza_festival' | 'custom';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string;
  heroHeadline?: string;
  heroSubhead?: string;
  themeOverride?: Partial<ThemeConfig>;
  coupons?: string[];
}

export interface VersionSnapshot {
  id: string;
  version: number;
  timestamp: string;
  publishedBy: string;
  changelog: string;
  homepage: HomepageConfig;
  theme: ThemeConfig;
  navigation: NavigationConfig;
  footer: FooterConfig;
}

export interface SDUIAnalyticsEvent {
  sectionId: string;
  sectionType: string;
  eventType: 'view' | 'click' | 'conversion';
  timestamp: string;
  metadata?: Record<string, any>;
}
