import { Routes, Route, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import MainLayout from './components/MainLayout';
import OwnerLayout from './components/OwnerLayout';
import DeliveryLayout from './components/DeliveryLayout';
import OnboardingGuard from './components/OnboardingGuard';
import AuthProvider from './components/AuthProvider';
import AIAssistant from './components/AIAssistant';
import ClickSpark from './components/ui/ClickSpark';
import LocationPrompt from './components/ui/LocationPrompt';
import FloatingCart from './components/ui/FloatingCart';
import FloatingTracker from './components/ui/FloatingTracker';
import GlobalLoader from './components/GlobalLoader';
import { CartAnimationProvider } from './components/ui/CartAnimationProvider';
import { OwnerGuard, DeliveryGuard, CustomerGuard, AuthGuard } from './components/auth/RouteGuards';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

import VerifyEmail from './pages/onboarding/VerifyEmail';
import SetupPhone from './pages/onboarding/SetupPhone';
import SetupLocation from './pages/onboarding/SetupLocation';

import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ProductDetail from './pages/ProductDetail';
import OrderTracking from './pages/OrderTracking';
import Contact from './pages/Contact';

import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerProducts from './pages/owner/OwnerProducts';
import OwnerOrders from './pages/owner/OwnerOrders';
import OwnerOrderHistory from './pages/owner/OwnerOrderHistory';
import OwnerAnalytics from './pages/owner/OwnerAnalytics';
import DeliveryPartners from './pages/owner/DeliveryPartners';
import OwnerEvents from './pages/owner/OwnerEvents';
import OwnerReports from './pages/owner/OwnerReports';
import OwnerAds from './pages/owner/OwnerAds';
import OwnerMediaLibrary from './pages/owner/OwnerMediaLibrary';
import OwnerSettings from './pages/owner/OwnerSettings';
import OwnerCustomers from './pages/owner/OwnerCustomers';
import OwnerCoupons from './pages/owner/OwnerCoupons';
import OwnerSecurity from './pages/owner/OwnerSecurity';
import OwnerEmailCenter from './pages/owner/OwnerEmailCenter';
import OwnerSpecialCategories from './pages/owner/OwnerSpecialCategories';
import OwnerHomepageManager from './pages/owner/OwnerHomepageManager';
import OwnerSlackCenter from './pages/owner/OwnerSlackCenter';
import OwnerNotificationCenter from './pages/owner/OwnerNotificationCenter';

import CustomerDashboard from './pages/CustomerDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryEarnings from './pages/delivery/DeliveryEarnings';
import DeliveryPerformance from './pages/delivery/DeliveryPerformance';
import DeliveryProfile from './pages/delivery/DeliveryProfile';
import DeliveryNotificationCenter from './pages/delivery/DeliveryNotificationCenter';

function AppContent() {
  const location = useLocation();
  return (
    <>
      <GlobalLoader />
      <AnimatePresence mode="wait">
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
            <AIAssistant />
            <LocationPrompt />
            <FloatingCart />
            <FloatingTracker />
          </CartAnimationProvider>
        </ClickSpark>
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;

