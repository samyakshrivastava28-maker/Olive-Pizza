/**
 * Mobile-First Viewport Configurations for Olive Pizza E2E Testing
 * Adheres strictly to Mobile First Policy (Highest Priority)
 */

export interface ViewportDefinition {
  width: number;
  height: number;
  name: string;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor: number;
  userAgent?: string;
}

export const VIEWPORTS: Record<string, ViewportDefinition> = {
  // Primary Target: Samsung Galaxy S21 FE 5G (SM_G990E)
  GALAXY_S21: {
    name: 'Samsung Galaxy S21 FE 5G',
    width: 412,
    height: 915,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-G990E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/134.0.6998.39 Mobile Safari/537.36',
  },

  // Standard Mobile: iPhone 14 / Standard Mobile
  IPHONE_14: {
    name: 'iPhone 14 / Standard Mobile',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },

  // Tablet Viewport
  TABLET_IPAD: {
    name: 'iPad Mini / Tablet',
    width: 768,
    height: 1024,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },

  // Secondary Desktop Viewport
  DESKTOP_HD: {
    name: 'Desktop 1280x800',
    width: 1280,
    height: 800,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
} as const;

// Default mobile-first viewport is Samsung Galaxy S21 FE 5G
export const DEFAULT_VIEWPORT = VIEWPORTS.GALAXY_S21;
