import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuthStore, useCartStore, useAppStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, Suspense } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Home, Menu as MenuIcon, ShoppingBag, User, Search, MapPin, ReceiptText, WifiOff, Download, ArrowDownToLine, RefreshCw } from 'lucide-react';

import PWAPrompts from './ui/PWAPrompts';
import { usePWA } from '../lib/usePWA';
import Aurora from './ui/Aurora';
import { prefetchRoute } from '../lib/prefetch';

export default function MainLayout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const role = useAuthStore(state => state.role);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const cartItems = useCartStore(state => state.items);
  const updateAvailable = useAppStore(state => state.updateAvailable);
  const navigate = useNavigate();
  const location = useLocation();
  const { isOffline, canInstall, installApp, isStandalone, hasInstalled } = usePWA();

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    if (user?.email === 'olivepizzarjn@gmail.com' && role !== 'owner') {
      updateDoc(doc(db, 'users', user.uid), { role: 'owner' })
        .then(() => {
          console.log('Successfully upgraded olivepizzarjn to owner!');
          useAuthStore.getState().setUser(user, 'owner');
        })
        .catch(err => console.error('Failed to make owner:', err));
    }
  }, [user, role]);

  const [showNav, setShowNav] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Check if user is at the bottom of the page (within 50px)
      const isAtBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 50;
      if (isAtBottom) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: <Home className="w-6 h-6" /> },
    { name: 'Menu', path: '/menu', icon: <MenuIcon className="w-6 h-6" /> },
    { name: 'Orders', path: '/dashboard', icon: <ReceiptText className="w-6 h-6" /> },
    { name: 'Cart', path: '/cart', icon: <ShoppingBag className="w-6 h-6" />, badge: cartCount },
    { name: 'Profile', path: isAuthenticated ? '/dashboard' : '/login', icon: <User className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 pb-[72px] md:pb-0">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <Aurora 
          colorStops={["#749578", "#55775a", "#425e47"]}
          amplitude={1.2}
          blend={0.5}
        />
      </div>
      <PWAPrompts />
      
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white font-bold text-center py-2 px-4 shadow-md flex items-center justify-center gap-2 sticky top-0 z-[60]"
          >
            <WifiOff className="w-4 h-4" />
            Offline Mode - Viewing cached menu
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 bg-dark-900 border-b border-dark-800 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/ditkqli2i/image/upload/v1782113833/olive-pizza-logo_nsoh49.webp" alt="Olive Pizza Logo" className="h-8 md:h-10 w-auto object-contain" />
              <span className="text-xl md:text-2xl font-black text-primary-500 tracking-tight hidden sm:block">Olive Pizza</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-8 items-center">
            {isAuthenticated && user?.fullAddress && (
              <div className="flex items-center gap-2 text-sm text-slate-300 max-w-[200px] bg-dark-800 px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="truncate">{user.fullAddress}</span>
              </div>
            )}
            
            <Link to="/" onMouseEnter={() => prefetchRoute('/')} onTouchStart={() => prefetchRoute('/')} className="font-medium text-slate-200 hover:text-primary-500 transition-colors">Home</Link>
            <Link to="/menu" onMouseEnter={() => prefetchRoute('/menu')} onTouchStart={() => prefetchRoute('/menu')} className="font-medium text-slate-200 hover:text-primary-500 transition-colors">Menu</Link>
            <Link to="/contact" onMouseEnter={() => prefetchRoute('/contact')} onTouchStart={() => prefetchRoute('/contact')} className="font-medium text-slate-200 hover:text-primary-500 transition-colors">Contact</Link>
            
            {/* Role-based Dashboard Links */}
            {isAuthenticated && role === 'owner' && (
              <Link to="/owner/dashboard" onMouseEnter={() => prefetchRoute('/owner/dashboard')} onTouchStart={() => prefetchRoute('/owner/dashboard')} className="font-bold text-accent-500 hover:text-accent-400 transition-colors">Owner Panel</Link>
            )}
            {isAuthenticated && role === 'delivery_partner' && (
              <Link to="/delivery/dashboard" onMouseEnter={() => prefetchRoute('/delivery/dashboard')} onTouchStart={() => prefetchRoute('/delivery/dashboard')} className="font-bold text-secondary-500 hover:text-secondary-400 transition-colors">Delivery Panel</Link>
            )}
            {isAuthenticated && (!role || role === 'customer') && (
              <Link to="/dashboard" onMouseEnter={() => prefetchRoute('/dashboard')} onTouchStart={() => prefetchRoute('/dashboard')} className="font-bold text-primary-500 hover:text-primary-400 transition-colors">Dashboard</Link>
            )}

            <Link to="/cart" onMouseEnter={() => prefetchRoute('/cart')} onTouchStart={() => prefetchRoute('/cart')} className="font-medium text-slate-200 hover:text-primary-500 transition-colors flex items-center gap-2 relative">
              <ShoppingBag className="w-5 h-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span 
                    key={cartCount}
                    initial={{ scale: 0.5, y: -10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="absolute -top-1.5 -right-2 bg-primary-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-md"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            
            {/* Desktop PWA Install/Open Button */}
            {updateAvailable && (
              <button 
                onClick={() => window.dispatchEvent(new Event('trigger-pwa-update'))}
                className="font-bold text-white hover:bg-green-500 bg-green-600 transition-all flex items-center gap-2 px-4 py-2 rounded-full shadow-md animate-pulse"
              >
                <RefreshCw className="w-4 h-4" /> Update App
              </button>
            )}
            {!isStandalone && canInstall && !updateAvailable && (
              <button 
                onClick={installApp}
                className="font-bold text-primary-500 hover:text-white hover:bg-primary-600 transition-all flex items-center gap-2 bg-primary-500/10 px-4 py-2 rounded-full border border-primary-500/30"
              >
                <Download className="w-4 h-4" /> Download for your device
              </button>
            )}
            {!isStandalone && !canInstall && hasInstalled && (
              <button 
                onClick={() => alert("The app is already installed! Please open it from your device's home screen or app drawer.")}
                className="font-bold text-white hover:text-white hover:bg-primary-500 transition-all flex items-center gap-2 bg-primary-600 px-4 py-2 rounded-full shadow-md shadow-primary-500/20"
              >
                <ArrowDownToLine className="w-4 h-4" /> Open App
              </button>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="font-bold text-white hidden lg:block">Hello, {user?.name?.split(' ')[0] || 'User'}</span>
                <button 
                  onClick={handleLogout}
                  className="bg-dark-800 hover:bg-dark-700 text-slate-200 px-4 py-2 rounded-full font-medium transition-colors border border-dark-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-full font-medium transition-colors shadow-md">Sign In</Link>
            )}
          </nav>

          {/* Mobile Header Actions */}
          <div className="flex md:hidden items-center gap-2">
             {updateAvailable && (
               <button 
                 onClick={() => window.dispatchEvent(new Event('trigger-pwa-update'))}
                 className="bg-green-600 text-white hover:bg-green-500 transition-all px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 font-bold text-[10px] whitespace-nowrap animate-pulse"
                 aria-label="Update App"
               >
                 <RefreshCw className="w-3 h-3" /> Update App
               </button>
             )}
             {!isStandalone && canInstall && !updateAvailable && (
               <button 
                 onClick={installApp}
                 className="bg-primary-500/10 text-primary-500 hover:bg-primary-600 hover:text-white transition-all px-3 py-1.5 rounded-full border border-primary-500/30 flex items-center gap-1 font-bold text-[10px] whitespace-nowrap"
                 aria-label="Download for mobile"
               >
                 <Download className="w-3 h-3" /> Download for mobile
               </button>
             )}
             {!isStandalone && !canInstall && hasInstalled && (
               <button 
                 onClick={() => alert("The app is already installed! Please open it from your home screen or app drawer.")}
                 className="bg-primary-600 text-white hover:bg-primary-500 transition-all px-3 py-1.5 rounded-full shadow-md shadow-primary-500/20 flex items-center gap-1 font-bold text-[10px] whitespace-nowrap"
                 aria-label="Open App"
               >
                 <ArrowDownToLine className="w-3 h-3" /> Open App
               </button>
             )}
             <Link to="/menu?search=1" className="text-slate-300 p-2 ml-1"><Search className="w-5 h-5" /></Link>
             {isAuthenticated ? (
                <Link to="/dashboard" className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-primary-500 overflow-hidden border border-dark-700">
                  {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                </Link>
             ) : (
                <Link to="/login" className="text-xs font-bold bg-primary-600 text-white px-4 py-1.5 rounded-full">Sign In</Link>
             )}
          </div>
        </div>
      </header>
      
      <main className={`flex-1 w-full ${location.pathname === '/' ? '' : 'max-w-7xl mx-auto py-2 md:py-8'}`}>
        <Suspense fallback={
          <div className="w-full h-[60vh] flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-dark-800 border-t-primary-500 rounded-full animate-spin" />
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav 
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-dark-900/90 backdrop-blur-xl border-t border-dark-800/60 flex items-center justify-between px-2 z-[70] transition-transform duration-300 ease-in-out shadow-[0_-4px_24px_rgba(0,0,0,0.4)] ${
          showNav ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)', paddingTop: '4px' }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'));
          return (
            <Link 
              key={item.name} 
              to={item.path} 
              onMouseEnter={() => prefetchRoute(item.path)}
              onTouchStart={() => prefetchRoute(item.path)}
              id={item.name === 'Cart' ? 'mobile-cart-nav-target' : undefined}
              className="flex flex-col items-center justify-center w-full min-h-[56px] relative group touch-manipulation"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 bg-primary-500/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className={`relative transition-all duration-200 ${isActive ? 'text-primary-500 -translate-y-0.5' : 'text-slate-400 group-hover:text-slate-200 group-active:scale-95'}`}>
                {item.icon}
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2 bg-secondary-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full shadow-md border border-dark-900">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-bold mt-1 tracking-wide transition-all duration-200 ${isActive ? 'text-primary-500 opacity-100' : 'text-slate-400 opacity-80'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="w-full bg-dark-900 text-white py-8 md:py-12 mt-auto border-t border-dark-800 pb-24 md:pb-12">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-black mb-2 text-primary-500">Olive Pizza</div>
          <p className="text-sm text-slate-400 mb-1">Dongargaon Rd, near Saraswati School, Gokul Nagar</p>
          <p className="text-sm text-slate-400 mb-6">Rajnandgaon, Chhattisgarh 491441</p>
          
          <div className="flex justify-center gap-6 mb-8 text-sm flex-wrap">
            <Link to="/contact" className="text-slate-300 hover:text-white transition-colors">Contact Us</Link>
            <Link to="/privacy-policy" className="text-slate-300 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-slate-300 hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/delivery-policy" className="text-slate-300 hover:text-white transition-colors">Delivery Policy</Link>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=21.0810244,81.0123793`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">Get Directions</a>
          </div>

          <div className="mt-8 text-xs text-slate-500">
            © {new Date().getFullYear()} Olive Pizza. All rights reserved.
          </div>
          <div className="mt-2 text-[10px] md:text-xs font-medium text-slate-400">
            A Premium Website By <a href="https://28webhub.netlify.app" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 hover:underline transition-colors">S-Web Hub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
