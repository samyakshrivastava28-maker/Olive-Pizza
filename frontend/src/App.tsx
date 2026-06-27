import { Routes, Route, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';

// Eager imports for layout, guards, and critical UI
import MainLayout from './components/MainLayout';
import AuthProvider from './components/AuthProvider';
import ClickSpark from './components/ui/ClickSpark';
import GlobalLoader from './components/GlobalLoader';
import { CartAnimationProvider } from './components/ui/CartAnimationProvider';
import { OwnerGuard, DeliveryGuard, CustomerGuard, AuthGuard } from './components/auth/RouteGuards';
import FloatingCart from './components/ui/FloatingCart';
import LocationPrompt from './components/ui/LocationPrompt';
import PushNotificationManager from './components/PushNotificationManager';

// Lazy loaded heavy components
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const FloatingTracker = lazy(() => import('./components/ui/FloatingTracker'));

// Lazy loaded layouts & guards
const OwnerLayout = lazy(() => import('./components/OwnerLayout'));
const DeliveryLayout = lazy(() => import('./components/DeliveryLayout'));
const OnboardingGuard = lazy(() => import('./components/OnboardingGuard'));

// Lazy loaded public pages
const Home = lazy(() => import('./pages/Home'));
const Menu = lazy(() => import('./pages/Menu'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// Lazy loaded onboarding
const VerifyEmail = lazy(() => import('./pages/onboarding/VerifyEmail'));
const SetupPhone = lazy(() => import('./pages/onboarding/SetupPhone'));
const SetupLocation = lazy(() => import('./pages/onboarding/SetupLocation'));

// Lazy loaded owner pages
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const OwnerProducts = lazy(() => import('./pages/owner/OwnerProducts'));
const OwnerOrders = lazy(() => import('./pages/owner/OwnerOrders'));
const OwnerOrderHistory = lazy(() => import('./pages/owner/OwnerOrderHistory'));
const OwnerAnalytics = lazy(() => import('./pages/owner/OwnerAnalytics'));
const DeliveryPartners = lazy(() => import('./pages/owner/DeliveryPartners'));
const OwnerEvents = lazy(() => import('./pages/owner/OwnerEvents'));
const OwnerReports = lazy(() => import('./pages/owner/OwnerReports'));
const OwnerAds = lazy(() => import('./pages/owner/OwnerAds'));
const OwnerMediaLibrary = lazy(() => import('./pages/owner/OwnerMediaLibrary'));
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'));
const OwnerCustomers = lazy(() => import('./pages/owner/OwnerCustomers'));
const OwnerCoupons = lazy(() => import('./pages/owner/OwnerCoupons'));
const OwnerSecurity = lazy(() => import('./pages/owner/OwnerSecurity'));
const OwnerEmailCenter = lazy(() => import('./pages/owner/OwnerEmailCenter'));
const OwnerSpecialCategories = lazy(() => import('./pages/owner/OwnerSpecialCategories'));
const OwnerHomepageManager = lazy(() => import('./pages/owner/OwnerHomepageManager'));
const OwnerSlackCenter = lazy(() => import('./pages/owner/OwnerSlackCenter'));
const OwnerNotificationCenter = lazy(() => import('./pages/owner/OwnerNotificationCenter'));

// Lazy loaded delivery pages
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryEarnings = lazy(() => import('./pages/delivery/DeliveryEarnings'));
const DeliveryPerformance = lazy(() => import('./pages/delivery/DeliveryPerformance'));
const DeliveryProfile = lazy(() => import('./pages/delivery/DeliveryProfile'));
const DeliveryNotificationCenter = lazy(() => import('./pages/delivery/DeliveryNotificationCenter'));

function AppContent() {
  const location = useLocation();
  return (
    <>
      <GlobalLoader />
      <PushNotificationManager />
      <AnimatePresence mode="wait">
      <Suspense fallback={<div className="min-h-[100dvh] w-full bg-dark-950 flex flex-col items-center justify-center pointer-events-none"><div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" /></div>}>
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/product/:productId" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected Customer Routes */}
            <Route element={<CustomerGuard />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route element={<OnboardingGuard />}>
                <Route path="/dashboard" element={<CustomerDashboard />} />
                <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
              </Route>
            </Route>
          </Route>

          {/* Onboarding Routes (Auth Required) */}
          <Route element={<AuthGuard />}>
            <Route path="/onboarding/verify" element={<VerifyEmail />} />
            <Route path="/onboarding/phone" element={<SetupPhone />} />
            <Route path="/onboarding/location" element={<SetupLocation />} />
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
      </Suspense>
    </AnimatePresence>
    </>
  );
}

function App() {
  return (
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
          </CartAnimationProvider>
        </ClickSpark>
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;

