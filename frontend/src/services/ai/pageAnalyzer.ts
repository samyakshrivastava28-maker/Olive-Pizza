/**
 * pageAnalyzer.ts
 *
 * Live Page Context Analyzer for Olive AI Assistant.
 * Captures the current page state (route, visible headings, scroll position,
 * visible product names, checkout step, cart state) and formats it as a
 * rich context snapshot to send to the AI backend.
 *
 * This allows the AI to understand what the customer is currently seeing
 * and provide page-specific guidance (e.g. "I can see you're on the checkout
 * page — would you like help completing your payment?").
 */

export interface PageContext {
  /** Current browser route, e.g. /menu, /checkout */
  route: string;
  /** Page title from document.title */
  pageTitle: string;
  /** Main visible headings on the page */
  visibleHeadings: string[];
  /** Visible product/item names found in the DOM */
  visibleProducts: string[];
  /** Checkout step if on /checkout (address | payment | review) */
  checkoutStep: string;
  /** Whether an order confirmation modal is visible */
  activeModal: string;
  /** Scroll progress (0–100%) */
  scrollProgress: number;
  /** Whether the cart drawer/panel is currently open */
  isCartOpen: boolean;
  /** Current search query if on /menu */
  activeSearchQuery: string;
  /** Active category filter if on /menu */
  activeCategoryFilter: string;
  /** Page-specific contextual hint for AI */
  pageHint: string;
}

/**
 * Extract visible text from a CSS selector, safely.
 */
function queryTextAll(selector: string, max = 5): string[] {
  try {
    return Array.from(document.querySelectorAll(selector))
      .slice(0, max)
      .map(el => (el as HTMLElement).innerText?.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Detect the current checkout step from the DOM.
 */
function detectCheckoutStep(): string {
  const path = window.location.pathname;
  if (!path.includes('/checkout')) return 'none';

  // Look for active step indicators
  const activeStep = document.querySelector('[data-checkout-step][data-active="true"], .checkout-step.active, [aria-current="step"]');
  if (activeStep) {
    return (activeStep as HTMLElement).dataset?.checkoutStep
      || activeStep.getAttribute('aria-label')
      || activeStep.textContent?.trim().toLowerCase()
      || 'checkout';
  }

  // Fallback: infer from visible form fields
  if (document.querySelector('input[name="address"], input[placeholder*="address" i]')) return 'address';
  if (document.querySelector('input[name="upi"], [data-payment], button[data-method]')) return 'payment';
  if (document.querySelector('[data-order-summary], .order-summary')) return 'review';

  return 'checkout';
}

/**
 * Detect if any modal is currently open.
 */
function detectActiveModal(): string {
  // Common modal indicators
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
    const title = document.querySelector('[role="dialog"] h1, [role="dialog"] h2, [role="dialog"] .modal-title');
    return title ? (title as HTMLElement).innerText?.trim() : 'Modal Open';
  }
  if (document.querySelector('.modal-backdrop, [data-modal-open="true"]')) return 'Modal Open';
  return 'none';
}

/**
 * Try to read the active search query from URL params or visible search input.
 */
function detectSearchQuery(): string {
  const params = new URLSearchParams(window.location.search);
  const urlSearch = params.get('search') || params.get('q') || '';
  if (urlSearch) return urlSearch;
  const input = document.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="menu" i]') as HTMLInputElement;
  return input?.value?.trim() || '';
}

/**
 * Try to read the active category filter from URL params or active filter pill.
 */
function detectCategoryFilter(): string {
  const params = new URLSearchParams(window.location.search);
  const urlCat = params.get('category') || '';
  if (urlCat) return urlCat;
  const activePill = document.querySelector('[data-category][aria-pressed="true"], .category-pill.active, [data-active-category]');
  return activePill ? (activePill as HTMLElement).textContent?.trim() || '' : '';
}

/**
 * Generate a page-specific contextual hint for the AI.
 */
function generatePageHint(route: string, checkoutStep: string): string {
  if (route === '/') return 'Customer is on the Home page. Offer to show the menu or today\'s deals.';
  if (route === '/menu') return 'Customer is browsing the Menu. Help them find, compare, or customise items.';
  if (route === '/cart') return 'Customer has items in cart. Help them review, apply coupon codes, or proceed to checkout.';
  if (route === '/checkout') {
    if (checkoutStep === 'address') return 'Customer is entering their delivery address at checkout.';
    if (checkoutStep === 'payment') return 'Customer is choosing their payment method at checkout.';
    if (checkoutStep === 'review') return 'Customer is reviewing their order before placing it.';
    return 'Customer is at the Checkout page — guide them through placing their order.';
  }
  if (route.startsWith('/order-tracking')) return 'Customer is tracking a live order. Help them understand delivery status or contact support.';
  if (route === '/dashboard') return 'Customer is on their Account Dashboard. Help them view history, repeat an order, or manage addresses.';
  if (route === '/assistant') return 'Customer is chatting with Olive AI. Provide the best possible assistance.';
  if (route === '/privacy-policy') return 'Customer is reading the Privacy Policy. Answer any data/privacy questions clearly.';
  if (route === '/refund-policy') return 'Customer is reading the Refund Policy. Help them understand refund eligibility and process.';
  if (route === '/cancellation-policy') return 'Customer is reading the Cancellation Policy.';
  if (route === '/delivery-policy') return 'Customer is reading the Delivery Policy. Clarify delivery zones, charges, and timelines.';
  if (route === '/terms') return 'Customer is reading Terms & Conditions.';
  if (route === '/contact') return 'Customer is on the Contact page. Provide direct support info and guide them.';
  if (route === '/about') return 'Customer is reading About Olive Pizza.';
  if (route === '/faq') return 'Customer is reading the FAQ. Answer their question directly.';
  if (route === '/login') return 'Customer is on the Login page. Help them sign in or create an account.';
  return `Customer is on page: ${route}`;
}

/**
 * Capture a full snapshot of the current page state.
 * Safe — never throws, always returns a valid PageContext.
 */
export function capturePageContext(): PageContext {
  try {
    const route = window.location.pathname;
    const pageTitle = document.title || route;
    const checkoutStep = detectCheckoutStep();
    const activeModal = detectActiveModal();

    // Capture visible headings (h1, h2)
    const visibleHeadings = queryTextAll('h1, h2', 4);

    // Capture visible product names from product cards
    const visibleProducts = queryTextAll(
      '[data-product-name], .product-name, .menu-item-name, h3.product-title, [data-testid="product-name"]',
      8
    );

    // Scroll progress
    const scrollProgress = Math.round(
      (window.scrollY / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)) * 100
    );

    // Cart panel open state
    const isCartOpen = !!(document.querySelector('[data-cart-open="true"], .cart-drawer.open, [aria-label="Cart"][aria-expanded="true"]'));

    const activeSearchQuery = detectSearchQuery();
    const activeCategoryFilter = detectCategoryFilter();
    const pageHint = generatePageHint(route, checkoutStep);

    return {
      route,
      pageTitle,
      visibleHeadings,
      visibleProducts,
      checkoutStep,
      activeModal,
      scrollProgress,
      isCartOpen,
      activeSearchQuery,
      activeCategoryFilter,
      pageHint,
    };
  } catch {
    return {
      route: window.location.pathname,
      pageTitle: document.title || '',
      visibleHeadings: [],
      visibleProducts: [],
      checkoutStep: 'none',
      activeModal: 'none',
      scrollProgress: 0,
      isCartOpen: false,
      activeSearchQuery: '',
      activeCategoryFilter: '',
      pageHint: '',
    };
  }
}

/**
 * Format PageContext into a compact string for the AI frontendContext payload.
 */
export function formatPageContextForAI(ctx: PageContext): string {
  const parts: string[] = [
    `Route: ${ctx.route}`,
    ctx.pageTitle ? `Page: ${ctx.pageTitle}` : '',
    ctx.visibleHeadings.length ? `Visible headings: ${ctx.visibleHeadings.join(' | ')}` : '',
    ctx.visibleProducts.length ? `Visible products on page: ${ctx.visibleProducts.join(', ')}` : '',
    ctx.checkoutStep !== 'none' ? `Checkout step: ${ctx.checkoutStep}` : '',
    ctx.activeModal !== 'none' ? `Active modal: ${ctx.activeModal}` : '',
    ctx.activeSearchQuery ? `Search query: "${ctx.activeSearchQuery}"` : '',
    ctx.activeCategoryFilter ? `Category filter: ${ctx.activeCategoryFilter}` : '',
    ctx.pageHint ? `Context: ${ctx.pageHint}` : '',
  ];
  return parts.filter(Boolean).join('\n');
}
