/**
 * No-Code Page Builder Types & Schemas
 */

export type BlockType =
  | 'HeroBanner'
  | 'PromoBannerCarousel'
  | 'CategoryGrid'
  | 'FeaturedItemsCarousel'
  | 'TestimonialsBlock'
  | 'CountdownOfferBlock'
  | 'RichTextBlock'
  | 'CustomHTMLBlock';

export interface BlockStyleOverrides {
  backgroundColor?: string;
  textColor?: string;
  paddingY?: 'none' | 'small' | 'medium' | 'large';
  animationIn?: 'fade' | 'slide' | 'none';
}

export interface PageBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  order: number;
  props: Record<string, any>;
  styleOverrides?: BlockStyleOverrides;
}

export interface PageConfig {
  slug: string;
  draft: PageBlock[];
  live: PageBlock[];
  updatedAt: string;
  updatedBy: string;
}

export interface PageVersionEntry {
  id: string;
  timestamp: string;
  publishedBy: string;
  blocks: PageBlock[];
}

export interface SiteThemeConfig {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
  defaultMode: 'dark' | 'light';
}
