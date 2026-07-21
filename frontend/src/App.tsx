import { Routes, Route, useLocation, useNavigate } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, ComponentType, useEffect, useRef } from 'react';
import { useAuthStore } from './lib/store';
import { UpdateBanner, ForceUpdateScreen } from './components/VersionUpdateScreens';
import { useDeviceSession } from './hooks/useDeviceSession';
import OfflineBanner from './components/ui/OfflineBanner';
import { useVersionCheck } from './hooks/useVersionCheck';
import NativeAppUpdater from './components/NativeAppUpdater';
import CartSyncManager from './components/CartSyncManager';
import { NotificationDiagnosticsOverlay } from './components/ui/NotificationDiagnosticsOverlay';

// Custom lazy loading with retry for chunk errors (prevents black screen on PWA update)
const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const lastRefresh = parseInt(window.sessionStorage.getItem('force-refreshed-time') || '0', 10);
      const now = Date.now();
      
      // If we haven't force refreshed in the last 30 seconds, try it once
      if (now - lastRefresh > 30000) {
        window.sessionStorage.setItem('force-refreshed-time', now.toString());
        
        // Break infinite loop: clear PWA caches and unregister service workers before reloading
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
          } catch (e) {
            console.error('Failed to unregister SW', e);
          }
        }
        
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            for (let key of cacheKeys) {
              await caches.delete(key);
            }
          } catch (e) {
            console.error('Failed to clear caches', e);
          }
        }
        
        // Try to bust the cache by adding a timestamp
        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
        return new Promise<{ default: T }>(() => {});
      }
      
      // If we already refreshed recently, fail gracefully instead of crashing the app
      console.error('Component load failed after forced refresh. Returning fallback.', error);
      return {
        default: () => (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-900 border border-dark-800 rounded-2xl m-4 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Module Unavailable</h2>
            <p className="text-slate-400 text-sm mb-4">A critical application module failed to load. Please check your connection.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl transition-all"
            >
              Reload Page
            </button>
          </div>
        )
      } as unknown as { default: T };
    }
  });

// Eager imports for layout, guards, and critical UI
import MainLayout from './components/MainLayout';
import AuthProvider from './components/AuthProvider';
import AutoUpdater from "./components/ui/AutoUpdater";
import ClickSpark from './components/ui/ClickSpark';
import { CartAnimationProvider } from './components/ui/CartAnimationProvider';
import { OwnerGuard, DeliveryGuard, CustomerGuard, AuthGuard } from './components/auth/RouteGuards';
import LocationPrompt from './components/ui/LocationPrompt';
import PushNotificationManager from './components/PushNotificationManager';
import PizzaLoader from './components/ui/PizzaLoader';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

// Lazy loaded heavy components
const AIAssistant = lazyWithRetry(() => import('./components/AIAssistant'));
const UniversalAssistant = lazyWithRetry(() => import('./pages/UniversalAssistant'));
const FloatingTracker = lazyWithRetry(() => import('./components/ui/FloatingTracker'));

// Lazy loaded layouts & guards
const OwnerLayout = lazyWithRetry(() => import('./components/OwnerLayout'));
const DeliveryLayout = lazyWithRetry(() => import('./components/DeliveryLayout'));
const OnboardingGuard = lazyWithRetry(() => import('./components/OnboardingGuard'));

// Lazy loaded public pages
const Home = lazyWithRetry(() => import('./pages/Home'));
const Menu = lazyWithRetry(() => import('./pages/Menu'));
const Cart = lazyWithRetry(() => import('./pages/Cart'));
const Checkout = lazyWithRetry(() => import('./pages/Checkout'));
const ProductDetail = lazyWithRetry(() => import('./pages/ProductDetail'));
const OrderTracking = lazyWithRetry(() => import('./pages/OrderTracking'));
const RecheckOrder = lazyWithRetry(() => import('./pages/RecheckOrder'));
const ProcessingOrder = lazyWithRetry(() => import('./pages/ProcessingOrder'));

// Lazy loaded Info & Legal pages
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const About = lazyWithRetry(() => import('./pages/About'));
const FAQ = lazyWithRetry(() => import('./pages/FAQ'));
const DeleteAccount = lazyWithRetry(() => import('./pages/DeleteAccount'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/legal/PrivacyPolicy'));
const Terms = lazyWithRetry(() => import('./pages/legal/Terms'));
const RefundPolicy = lazyWithRetry(() => import('./pages/legal/RefundPolicy'));
const DeliveryPolicy = lazyWithRetry(() => import('./pages/legal/DeliveryPolicy'));
const CookiePolicy = lazyWithRetry(() => import('./pages/legal/CookiePolicy'));
const CancellationPolicy = lazyWithRetry(() => import('./pages/legal/CancellationPolicy'));
const Accessibility = lazyWithRetry(() => import('./pages/legal/Accessibility'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));

// Lazy loaded onboarding
const VerifyEmail = lazyWithRetry(() => import('./pages/onboarding/VerifyEmail'));
const SetupPhone = lazyWithRetry(() => import('./pages/onboarding/SetupPhone'));
const SetupLocation = lazyWithRetry(() => import('./pages/onboarding/SetupLocation'));
const OrderSuccessScreen = lazyWithRetry(() => import('./pages/OrderSuccessScreen'));

// Lazy loaded owner pages
const OwnerDashboard = lazyWithRetry(() => import('./pages/owner/OwnerDashboard'));
const OwnerProducts = lazyWithRetry(() => import('./pages/owner/OwnerProducts'));
const OwnerOrders = lazyWithRetry(() => import('./pages/owner/OwnerOrders'));
const OwnerOrderHistory = lazyWithRetry(() => import('./pages/owner/OwnerOrderHistory'));
const OwnerAnalytics = lazyWithRetry(() => import('./pages/owner/OwnerAnalytics'));
const DeliveryPartners = lazyWithRetry(() => import('./pages/owner/DeliveryPartners'));
const OwnerEvents = lazyWithRetry(() => import('./pages/owner/OwnerEvents'));
const OwnerReports = lazyWithRetry(() => import('./pages/owner/OwnerReports'));
const OwnerAds = lazyWithRetry(() => import('./pages/owner/OwnerAds'));
const OwnerMediaLibrary = lazyWithRetry(() => import('./pages/owner/OwnerMediaLibrary'));
const OwnerSettings = lazyWithRetry(() => import('./pages/owner/OwnerSettings'));
const OwnerCustomers = lazyWithRetry(() => import('./pages/owner/OwnerCustomers'));
const OwnerCoupons = lazyWithRetry(() => import('./pages/owner/OwnerCoupons'));
const OwnerSecurity = lazyWithRetry(() => import('./pages/owner/OwnerSecurity'));
const OwnerEmailCenter = lazyWithRetry(() => import('./pages/owner/OwnerEmailCenter'));
const OwnerSpecialCategories = lazyWithRetry(() => import('./pages/owner/OwnerSpecialCategories'));
const OwnerVerificationMetrics = lazyWithRetry(() => import('./pages/owner/OwnerVerificationMetrics'));
const OwnerHomepageManager = lazyWithRetry(() => import('./pages/owner/OwnerHomepageManager'));
const OwnerVersionManagement = lazyWithRetry(() => import('./pages/owner/OwnerVersionManagement'));
const OwnerSlackCenter = lazyWithRetry(() => import('./pages/owner/OwnerSlackCenter'));
const OwnerAIKnowledge = lazyWithRetry(() => import('./pages/owner/OwnerAIKnowledge'));
const OwnerNotificationCenter = lazyWithRetry(() => import('./pages/owner/OwnerNotificationCenter'));
const AIHealthMonitor = lazyWithRetry(() => import('./pages/owner/AIHealthMonitor'));
const OwnerNotificationDiagnostics = lazyWithRetry(() => import('./pages/owner/OwnerNotificationDiagnostics'));
const OwnerDataManager = lazyWithRetry(() => import('./pages/owner/DataManager'));

// Lazy loaded delivery pages
const CustomerDashboard = lazyWithRetry(() => import('./pages/CustomerDashboard'));
const DeliveryDashboard = lazyWithRetry(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryEarnings = lazyWithRetry(() => import('./pages/delivery/DeliveryEarnings'));
const DeliveryPerformance = lazyWithRetry(() => import('./pages/delivery/DeliveryPerformance'));
const DeliveryProfile = lazyWithRetry(() => import('./pages/delivery/DeliveryProfile'));
const DeliveryNotificationCenter = lazyWithRetry(() => import('./pages/delivery/DeliveryNotificationCenter'));

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const user = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);
  const hasRedirectedToDashboard = useRef(false);

  // Track active device session
  useDeviceSession();
  
  // Automatic background update checker
  useVersionCheck();

  // Prevent authenticated users from visiting login/register/forgot-password
  useEffect(() => {
    if (
      isAuthenticated &&
      (location.pathname === '/login' ||
        location.pathname === '/register' ||
        location.pathname === '/forgot-password')
    ) {
      if (role === 'owner' || role === 'admin') navigate('/owner/dashboard', { replace: true });
      else if (role === 'delivery_partner') navigate('/delivery/dashboard', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [isAuthenticated, role, location.pathname, navigate]);

  // Global Onboarding Enforcer: Make phone and location setup strictly compulsory for customers
  useEffect(() => {
    if (
      !isAuthenticated || 
      role !== 'customer' || 
      !user || 
      location.pathname.startsWith('/onboarding') || 
      location.pathname.startsWith('/login') || 
      location.pathname.startsWith('/register') ||
      location.pathname.startsWith('/auth')
    ) {
      return;
    }

    if (!user.phoneSetupCompleted && !user.phone) {
      navigate('/onboarding/phone', { replace: true });
    } else if (!user.locationSetupCompleted && !user.lat) {
      navigate('/onboarding/location', { replace: true });
    }
  }, [isAuthenticated, user, role, location.pathname, navigate]);

  // Role-based Landing Page Interceptor
  useEffect(() => {
    if (!isAuthenticated || !role || location.pathname !== '/') return;
    
    if ((role === 'owner' || role === 'admin') && !hasRedirectedToDashboard.current) {
      hasRedirectedToDashboard.current = true;
      navigate('/owner/dashboard', { replace: true });
    }
  }, [isAuthenticated, role, location.pathname, navigate]);

  // Global Session Initializer Blocker
  // This completely stops the app from rendering while we restore the persisted session.
  // This eliminates the "login flash" the user sees on startup.
  if (isLoading && !isAuthenticated) {
    return <PizzaLoader />;
  }

  return (
    <>
      <NativeAppUpdater />
      <CartSyncManager />
      <PushNotificationManager />
      <AutoUpdater />
      <NotificationDiagnosticsOverlay />
      <AnimatePresence mode="wait">
        <RouteErrorBoundary>
          <Suspense fallback={<PizzaLoader />}>
            <Routes location={location} key={location.pathname}>
              {/* Public Routes */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/product/:productId" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/recheck-order" element={<RecheckOrder />} />
                <Route path="/processing-order" element={<ProcessingOrder />} />
                <Route path="/order-success/:orderId" element={<OrderSuccessScreen />} />
                <Route path="/tracking/:orderId" element={<OrderTracking />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/assistant" element={<Suspense fallback={<PizzaLoader />}><UniversalAssistant /></Suspense>} />
                <Route path="/login" element={<Suspense fallback={<PizzaLoader />}><Login /></Suspense>} />
                <Route path="/register" element={<Suspense fallback={<PizzaLoader />}><Register /></Suspense>} />
                <Route path="/forgot-password" element={<Suspense fallback={<PizzaLoader />}><ForgotPassword /></Suspense>} />
                
                {/* Legal Pages */}
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/delete-account" element={<DeleteAccount />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/delivery-policy" element={<DeliveryPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/cancellation-policy" element={<CancellationPolicy />} />
                <Route path="/accessibility" element={<Accessibility />} />
                
                {/* Protected Customer Routes */}
                <Route element={<CustomerGuard />}>
                  <Route path="/checkout" element={<Suspense fallback={<PizzaLoader />}><Checkout /></Suspense>} />
                  <Route element={<Suspense fallback={<PizzaLoader />}><OnboardingGuard /></Suspense>}>
                    <Route path="/dashboard" element={<CustomerDashboard />} />
                    <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
                  </Route>
                </Route>
              </Route>
    
              {/* Onboarding Routes (Auth Required) */}
              <Route element={<AuthGuard />}>
                <Route path="/onboarding/verify" element={<Suspense fallback={<PizzaLoader />}><VerifyEmail /></Suspense>} />
                <Route path="/onboarding/phone" element={<Suspense fallback={<PizzaLoader />}><SetupPhone /></Suspense>} />
                <Route path="/onboarding/location" element={<Suspense fallback={<PizzaLoader />}><SetupLocation /></Suspense>} />
              </Route>
    
              {/* Owner Routes */}
              <Route element={<OwnerGuard />}>
                <Route path="/owner" element={<OwnerLayout />}>
                  <Route path="dashboard" element={<OwnerDashboard />} />
                  <Route path="menu" element={<OwnerProducts />} />
                  <Route path="products" element={<OwnerProducts />} />
                  <Route path="orders" element={<OwnerOrders />} />
                  <Route path="order-history" element={<OwnerOrderHistory />} />
                  <Route path="analytics" element={<OwnerAnalytics />} />
                  <Route path="partners" element={<DeliveryPartners />} />
                  <Route path="events" element={<OwnerEvents />} />
                  <Route path="reports" element={<OwnerReports />} />
                  <Route path="ads" element={<OwnerAds />} />
                  <Route path="media" element={<OwnerMediaLibrary />} />
                  <Route path="coupons" element={<OwnerCoupons />} />
                  <Route path="settings" element={<OwnerSettings />} />
                  <Route path="security" element={<OwnerSecurity />} />
                  <Route path="customers" element={<OwnerCustomers />} />
                  <Route path="email" element={<OwnerEmailCenter />} />
                  <Route path="slack" element={<OwnerSlackCenter />} />
                  <Route path="special-categories" element={<OwnerSpecialCategories />} />
                  <Route path="homepage" element={<OwnerHomepageManager />} />
                  <Route path="notifications" element={<OwnerNotificationCenter />} />
                  <Route path="verification-metrics" element={<OwnerVerificationMetrics />} />
                  <Route path="versions" element={<OwnerVersionManagement />} />
                  <Route path="ai-knowledge" element={<OwnerAIKnowledge />} />
                  <Route path="ai-monitor" element={<AIHealthMonitor />} />
                  <Route path="notification-diagnostics" element={<OwnerNotificationDiagnostics />} />
                  <Route path="data-manager/*" element={<OwnerDataManager />} />
                </Route>
              </Route>
    
              {/* Delivery Routes */}
              <Route element={<DeliveryGuard />}>
                <Route path="/delivery" element={<DeliveryLayout />}>
                  <Route path="dashboard" element={<DeliveryDashboard />} />
                  <Route path="earnings" element={<DeliveryEarnings />} />
                  <Route path="performance" element={<DeliveryPerformance />} />
                  <Route path="profile" element={<DeliveryProfile />} />
                  <Route path="notifications" element={<DeliveryNotificationCenter />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </AnimatePresence>
    </>
  );
}

import StartupGate from './components/ui/StartupGate';
import { SafeErrorBoundary } from './components/ui/SafeErrorBoundary';

function App() {
  return (
    <HelmetProvider>
      <ForceUpdateScreen />
      <UpdateBanner />
      <OfflineBanner />
      <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ClickSpark
          sparkColor='#d4af37'
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        >
          <SafeErrorBoundary>
            <CartAnimationProvider>
              <StartupGate>
                <AppContent />
                <Toaster 
                  position="top-center" 
                  toastOptions={{ 
                    className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl',
                    duration: 3000 
                  }} 
                />
                <Suspense fallback={null}>
                  <AIAssistant />
                </Suspense>
                <LocationPrompt />
              </StartupGate>
            </CartAnimationProvider>
          </SafeErrorBoundary>
        </ClickSpark>
      </AuthProvider>
    </MotionConfig>
    </HelmetProvider>
  );
}

export default App;

