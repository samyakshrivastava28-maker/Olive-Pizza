/**
 * Playwright Multi-App Browser Context Factory
 * Mobile-first browser automation for Olive Pizza
 * Supports Microsoft Edge, Google Chrome, and Chromium channels.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { VIEWPORTS, DEFAULT_VIEWPORT, type ViewportDefinition } from '../config/viewports.js';
import { TEST_ACCOUNTS, type TestUserAccount } from '../config/testAccounts.js';
import { getAppUrl, URLS } from '../config/ports.js';

export class BrowserContextManager {
  private browser: Browser | null = null;
  private activeContexts: BrowserContext[] = [];

  /**
   * Initializes or reuses the root browser instance
   */
  public async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    const headless = process.env.HEADLESS !== 'false';

    try {
      this.browser = await chromium.launch({
        channel: 'msedge',
        headless,
      });
    } catch {
      try {
        this.browser = await chromium.launch({
          channel: 'chrome',
          headless,
        });
      } catch {
        this.browser = await chromium.launch({
          headless,
        });
      }
    }

    return this.browser;
  }

  /**
   * Creates an isolated mobile browser context for a specific app
   */
  public async createAppContext(options?: {
    viewport?: ViewportDefinition;
    account?: TestUserAccount;
    geolocation?: { latitude: number; longitude: number };
  }): Promise<{ context: BrowserContext; page: Page }> {
    const browser = await this.getBrowser();
    const vp = options?.viewport || DEFAULT_VIEWPORT;
    const geo = options?.geolocation || { latitude: 21.0974, longitude: 81.0347 };

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      userAgent: vp.userAgent,
      geolocation: geo,
      permissions: ['geolocation', 'notifications'],
    });

    this.activeContexts.push(context);
    const page = await context.newPage();

    // If test account provided, pre-seed auth state if needed
    if (options?.account) {
      await this.hydrateAccount(page, options.account);
    }

    return { context, page };
  }

  /**
   * Hydrates authentication state into the browser page context
   */
  public async hydrateAccount(page: Page, account: TestUserAccount): Promise<void> {
    await page.addInitScript((acc) => {
      try {
        const authPayload = {
          uid: acc.id,
          email: acc.email,
          phone: acc.phone,
          displayName: acc.name,
          role: acc.role,
          branchId: acc.branchId,
          franchiseId: acc.franchiseId,
        };
        localStorage.setItem('olive_test_user', JSON.stringify(authPayload));
        localStorage.setItem('olive_active_role', acc.role);
        localStorage.setItem('olive_active_branch', acc.branchId);
        sessionStorage.setItem('olive_auth_session', JSON.stringify(authPayload));
      } catch {}
    }, account);
  }

  private appPages: Map<string, Page> = new Map();

  /**
   * Fast page provider: reuses active page for given app URL to accelerate testing
   */
  public async getAppPage(
    url: string,
    options?: { viewport?: ViewportDefinition; account?: TestUserAccount }
  ): Promise<Page> {
    const existing = this.appPages.get(url);
    if (existing && !existing.isClosed()) {
      return existing;
    }

    const { page } = await this.createAppContext(options);
    try {
      await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
    } catch {}
    this.appPages.set(url, page);
    return page;
  }

  /**
   * Fast action execution on cached app page
   */
  public async withAppPage<T>(
    url: string,
    action: (page: Page) => Promise<T>,
    options?: { viewport?: ViewportDefinition; account?: TestUserAccount }
  ): Promise<T> {
    const page = await this.getAppPage(url, options);
    return await action(page);
  }

  /**
   * Helper that creates an isolated context and page, executes an action, and guarantees cleanup
   */
  public async withPage<T>(
    action: (page: Page) => Promise<T>,
    options?: {
      viewport?: ViewportDefinition;
      account?: TestUserAccount;
      url?: string;
    }
  ): Promise<T> {
    if (options?.url) {
      const page = await this.getAppPage(options.url, {
        viewport: options.viewport,
        account: options.account,
      });
      return await action(page);
    }

    const { context, page } = await this.createAppContext({
      viewport: options?.viewport,
      account: options?.account,
    });
    try {
      return await action(page);
    } finally {
      try {
        await page.close();
      } catch {}
      try {
        await context.close();
      } catch {}
      const idx = this.activeContexts.indexOf(context);
      if (idx !== -1) this.activeContexts.splice(idx, 1);
    }
  }

  /**
   * Closes all active contexts and browser session
   */
  public async closeAll(): Promise<void> {
    this.appPages.clear();
    for (const ctx of this.activeContexts) {
      try {
        await ctx.close();
      } catch {}
    }
    this.activeContexts = [];

    if (this.browser) {
      try {
        await this.browser.close();
      } catch {}
      this.browser = null;
    }
  }
}

export const browserManager = new BrowserContextManager();
