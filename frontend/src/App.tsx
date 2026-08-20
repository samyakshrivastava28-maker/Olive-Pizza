import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router';
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
import AnnouncementBar from './components/AnnouncementBar';

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
import { OwnerGuard, DeliveryGuard, CustomerGuard, AuthGuard, DeveloperGuard } from './components/auth/RouteGuards';

import LocationPrompt from './components/ui/LocationPrompt';
import OrderCancelledModal from './components/customer/OrderCancelledModal';
import PushNotificationManager from './components/PushNotificationManager';
import PizzaLoader from './components/ui/PizzaLoader';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

// Lazy loaded heavy components
const AIAssistant = lazyWithRetry(() => import('./components/olive-pizza-ai/AIAssistant'));
const UniversalAssistant = lazyWithRetry(() => import('./pages/UniversalAssistant'));
const FloatingTracker = lazyWithRetry(() => import('./components/ui/FloatingTracker'));

// Lazy loaded layouts & guards
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

// Developer and delivery lazy imports
const DeveloperLayout = lazyWithRetry(() => import('./components/developer/DeveloperLayout'));
const DeveloperHealthPage = lazyWithRetry(() => import('./pages/developer/DeveloperHealthPage'));
const DeveloperDataManager = lazyWithRetry(() => import('./pages/developer/DeveloperDataManager'));
const DeveloperAIPage = lazyWithRetry(() => import('./pages/developer/DeveloperAIPage'));
const DeveloperSchedulerPage = lazyWithRetry(() => import('./pages/developer/DeveloperSchedulerPage'));
const DeveloperErrorCenterPage = lazyWithRetry(() => import('./pages/developer/DeveloperErrorCenterPage'));
const DeveloperConfigsPage = lazyWithRetry(() => import('./pages/developer/DeveloperConfigsPage'));
const DeveloperAuditPage = lazyWithRetry(() => import('./pages/developer/DeveloperAuditPage'));
const DeveloperTemplatesPage = lazyWithRetry(() => import('./pages/developer/DeveloperTemplatesPage'));
const DeveloperPaymentPage = lazyWithRetry(() => import('./pages/developer/DeveloperPaymentPage'));
const DeveloperEmailPage = lazyWithRetry(() => import('./pages/developer/DeveloperEmailPage'));
const DeveloperMonitorPage = lazyWithRetry(() => import('./pages/developer/DeveloperMonitorPage'));
const DeveloperDiagnosticsPage = lazyWithRetry(() => import('./pages/developer/DeveloperDiagnosticsPage'));
const DeveloperLogsPage = lazyWithRetry(() => import('./pages/developer/DeveloperLogsPage'));
const DeveloperSetupPage = lazyWithRetry(() => import('./pages/developer/DeveloperSetupPage'));

// Lazy loaded delivery pages
const CustomerDashboard = lazyWithRetry(() => import('./pages/CustomerDashboard'));
const DeliveryDashboard = lazyWithRetry(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryNavigationPage = lazyWithRetry(() => import('./pages/delivery/DeliveryNavigationPage'));
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
      if (role === 'owner' || role === 'admin' || (role as string) === 'developer') navigate('/owner', { replace: true });
      else if (role === 'delivery_partner' || role === 'delivery') navigate('/delivery/dashboard', { replace: true });
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

    if (!user.phoneVerified) {
      navigate('/onboarding/phone', { replace: true });
    } else if (!user.locationSetupCompleted && !user.lat) {
      navigate('/onboarding/location', { replace: true });
    }
  }, [isAuthenticated, user, role, location.pathname, navigate]);

  // Role-based Landing Page Interceptor
  useEffect(() => {
    if (!isAuthenticated || !role || location.pathname !== '/') return;
    
    if ((role === 'owner' || role === 'admin' || (role as string) === 'developer') && !hasRedirectedToDashboard.current) {
      hasRedirectedToDashboard.current = true;
      navigate('/owner', { replace: true });
    } else if ((role === 'delivery_partner' || role === 'delivery') && !hasRedirectedToDashboard.current) {
      hasRedirectedToDashboard.current = true;
      navigate('/delivery/dashboard', { replace: true });
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
      <AnnouncementBar />
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
                <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
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
                  <Route element={<Suspense fallback={<PizzaLoader />}><OnboardingGuard /></Suspense>}>
                    <Route path="/dashboard" element={<CustomerDashboard />} />
                  </Route>
                </Route>
              </Route>
    
              {/* Onboarding Routes (Auth Required) */}
              <Route element={<AuthGuard />}>
                <Route path="/onboarding/verify" element={<Suspense fallback={<PizzaLoader />}><VerifyEmail /></Suspense>} />
                <Route path="/onboarding/phone" element={<Suspense fallback={<PizzaLoader />}><SetupPhone /></Suspense>} />
                <Route path="/onboarding/location" element={<Suspense fallback={<PizzaLoader />}><SetupLocation /></Suspense>} />
              </Route>
    
              {/* Owner Routes — Replaced by Standalone Olive Pizza Owner Platform */}
              <Route
                path="/owner/*"
                element={
                  <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md bg-dark-800 border border-dark-700 rounded-3xl p-8 shadow-2xl space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center mx-auto text-2xl">
                        🍕
                      </div>
                      <h2 className="text-xl font-bold text-white">Olive Pizza Owner Platform</h2>
                      <p className="text-xs text-slate-400">
                        The Owner Dashboard has been moved to a dedicated, standalone management platform.
                      </p>
                      <a
                        href="http://localhost:5174"
                        className="inline-block w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-primary-600/20"
                      >
                        Launch Owner Application (Port 5174)
                      </a>
                    </div>
                  </div>
                }
              />



              {/* Developer Routes */}
              <Route element={<DeveloperGuard />}>
                <Route path="/developer" element={<DeveloperLayout />}>
                  <Route index element={<DeveloperHealthPage />} />
                  <Route path="health" element={<DeveloperHealthPage />} />
                  <Route path="data-manager" element={<DeveloperDataManager />} />
                  <Route path="data-manager/*" element={<DeveloperDataManager />} />
                  <Route path="ai" element={<DeveloperAIPage />} />
                  <Route path="scheduler" element={<DeveloperSchedulerPage />} />
                  <Route path="errors" element={<DeveloperErrorCenterPage />} />
                  <Route path="configs" element={<DeveloperConfigsPage />} />
                  <Route path="audit" element={<DeveloperAuditPage />} />
                  <Route path="templates" element={<DeveloperTemplatesPage />} />
                  <Route path="payment" element={<DeveloperPaymentPage />} />
                  <Route path="email" element={<DeveloperEmailPage />} />
                  <Route path="monitor" element={<DeveloperMonitorPage />} />
                  <Route path="diagnostics" element={<DeveloperDiagnosticsPage />} />
                  <Route path="logs" element={<DeveloperLogsPage />} />
                  <Route path="setup" element={<DeveloperSetupPage />} />
                  <Route path="devops" element={<Navigate to="/developer" replace />} />
                </Route>
              </Route>

              {/* Delivery Routes */}
              <Route element={<DeliveryGuard />}>
                <Route path="/delivery" element={<DeliveryLayout />}>
                  <Route path="dashboard" element={<DeliveryDashboard />} />
                  <Route path="navigation/:orderId" element={<DeliveryNavigationPage />} />
                  <Route path="navigation" element={<DeliveryNavigationPage />} />
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
                <OrderCancelledModal />
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

