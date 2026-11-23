/**
 * Olive Pizza Multi-Repository Dev Server & API Ports Configuration
 * Adheres strictly to PROJECT.md and TEST_INFRA.md
 */

export const PORTS = {
  CUSTOMER: 3000,
  BACKEND: 5000,
  OWNER: 5174,
  FRANCHISE: 5175,
  MANAGER: 5176,
  DELIVERY: 5177,
  POS: 5178,
} as const;

export const URLS = {
  CUSTOMER: `http://localhost:${PORTS.CUSTOMER}`,
  BACKEND: `http://localhost:${PORTS.BACKEND}`,
  BACKEND_API: `http://localhost:${PORTS.BACKEND}/api`,
  BACKEND_WS: `ws://127.0.0.1:${PORTS.BACKEND}/ws`,
  OWNER: `http://localhost:${PORTS.OWNER}`,
  FRANCHISE: `http://localhost:${PORTS.FRANCHISE}`,
  MANAGER: `http://localhost:${PORTS.MANAGER}`,
  DELIVERY: `http://localhost:${PORTS.DELIVERY}`,
  POS: `http://localhost:${PORTS.POS}`,
} as const;

/**
 * HashRouter vs BrowserRouter mapping across the 8 repositories:
 * - Customer: BrowserRouter (e.g. /menu, /cart, /product/:id)
 * - Owner: BrowserRouter (e.g. /home, /orders)
 * - Franchise: HashRouter (e.g. /#/dashboard, /#/orders)
 * - Restaurant Manager: HashRouter (e.g. /#/live-orders, /#/inventory)
 * - Delivery: BrowserRouter (e.g. /dashboard, /live-orders)
 * - POS: HashRouter (e.g. /#/billing, /#/orders)
 */
export const ROUTER_TYPES = {
  CUSTOMER: 'browser',
  OWNER: 'browser',
  FRANCHISE: 'hash',
  MANAGER: 'hash',
  DELIVERY: 'browser',
  POS: 'hash',
} as const;

export function getAppUrl(app: keyof typeof URLS, subPath: string = ''): string {
  const base = URLS[app];
  const routerType = ROUTER_TYPES[app as keyof typeof ROUTER_TYPES];
  if (!subPath || subPath === '/') return base;

  const normalized = subPath.startsWith('/') ? subPath : `/${subPath}`;
  if (routerType === 'hash') {
    return `${base}/#${normalized}`;
  }
  return `${base}${normalized}`;
}
