import { Routes, Route, useLocation, useNavigate } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, ComponentType, useEffect } from 'react';
import { useAuthStore } from './lib/store';

// Custom lazy loading with retry for chunk errors (prevents black screen on PWA update)
const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        
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
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          } catch (e) {
            console.error('Failed to clear caches', e);
          }
        }
        
        // Try to bust the cache by adding a timestamp
        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });

// Eager imports for layout, guards, and critical UI
import MainLayout from './components/MainLayout';
import AuthProvider from './components/AuthProvider';
import ClickSpark from './components/ui/ClickSpark';
import { CartAnimationProvider } from './components/ui/CartAnimationProvider';
import { OwnerGuard, DeliveryGuard, CustomerGuard, AuthGuard } from './components/auth/RouteGuards';
import FloatingCart from './components/ui/FloatingCart';
import LocationPrompt from './components/ui/LocationPrompt';
import PushNotificationManager from './components/PushNotificationManager';
import PizzaLoader from './components/ui/PizzaLoader';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loaded heavy components
const AIAssistant = lazyWithRetry(() => import('./components/AIAssistant'));
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
const OwnerHomepageManager = lazyWithRetry(() => import('./pages/owner/OwnerHomepageManager'));
const OwnerSlackCenter = lazyWithRetry(() => import('./pages/owner/OwnerSlackCenter'));
const OwnerNotificationCenter = lazyWithRetry(() => import('./pages/owner/OwnerNotificationCenter'));

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
  const user = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);

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
    
    if (role === 'owner' || role === 'admin') {
      navigate('/owner/dashboard', { replace: true });
    }
  }, [isAuthenticated, role, location.pathname, navigate]);

  return (
    <>
      <PushNotificationManager />
      <AnimatePresence mode="wait">
        <ErrorBoundary>
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/product/:productId" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/contact" element={<Contact />} />
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
      </ErrorBoundary>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ClickSpark
          sparkColor='#d4af37'
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        >
          <CartAnimationProvider>
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
            <FloatingCart />
            <Suspense fallback={null}>
              <FloatingTracker />
            </Suspense>
            <PizzaLoader />
          </CartAnimationProvider>
        </ClickSpark>
      </AuthProvider>
    </MotionConfig>
    </HelmetProvider>
  );
}

export default App;

