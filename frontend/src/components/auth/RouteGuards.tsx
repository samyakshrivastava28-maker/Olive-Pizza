import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import { logSecurityEvent } from '../../lib/security';
import { motion } from 'framer-motion';
import { auth } from '../../lib/firebase';

const showNotFoundToast = () => {
  toast.custom((t) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-white/10 overflow-hidden"
    >
      <div className="flex-1 p-5">
        <h3 className="text-lg font-black text-white mb-1">Page Not Found</h3>
        <p className="text-sm text-slate-300 font-medium leading-relaxed">
          The page you are trying to access does not exist or is unavailable.
        </p>
      </div>
      <div className="flex border-l border-white/10 bg-slate-800/50 hover:bg-slate-800 transition-colors">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full h-full px-6 flex items-center justify-center text-sm font-bold text-primary-500 focus:outline-none"
        >
          Close
        </button>
      </div>
    </motion.div>
  ), { duration: 4000 });
};

// 1. Core Auth Guard (Must be logged in)
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center font-bold text-slate-500">Authenticating...</div>;
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}

// 2. Customer Guard (Must be logged in, prevents guests)
export function CustomerGuard() {
  const { isAuthenticated, isLoading, role } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Authenticating...</div>;
  
  if (!isAuthenticated) {
    toast.error('Please login to access your dashboard');
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Prevent delivery partners and owners from accessing the customer dashboard directly
  if (role === 'delivery_partner') {
    return <Navigate to="/delivery/dashboard" replace />;
  }
  
  if (role === 'owner' || role === 'admin') {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <Outlet />;
}

// 3. Delivery Guard (Must be delivery_partner)
export function DeliveryGuard() {
  const { isAuthenticated, user, role, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <div className="h-screen flex items-center justify-center">Verifying Access...</div>;
  
  if (!isAuthenticated || role !== 'delivery_partner') {
    showNotFoundToast();
    if (role && role !== 'delivery_partner') {
      logSecurityEvent({
        action: 'unauthorized_delivery_access_attempt',
        route: location.pathname,
        uid: user?.uid,
        email: user?.email,
        role: role
      });
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// 4. Owner Guard (Must be owner or admin)
export function OwnerGuard() {
  const { isAuthenticated, user, role, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <div className="h-screen flex items-center justify-center">Verifying Access...</div>;
  
  if (!isAuthenticated || (role !== 'owner' && role !== 'admin')) {
    showNotFoundToast();
    if (role && role !== 'owner' && role !== 'admin') {
      logSecurityEvent({
        action: 'unauthorized_owner_access_attempt',
        route: location.pathname,
        uid: user?.uid,
        email: user?.email,
        role: role
      });
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// 5. Admin Guard (Optional: Admins)
export function AdminGuard() {
  const { isAuthenticated, user, role, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return null;
  
  if (!isAuthenticated || (role !== 'admin' && role !== 'owner')) {
    showNotFoundToast();
    if (role && role !== 'admin' && role !== 'owner') {
      logSecurityEvent({
        action: 'unauthorized_admin_access_attempt',
        route: location.pathname,
        uid: user?.uid,
        email: user?.email,
        role: role
      });
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// 6. Developer Guard (webhub2811@gmail.com + `developer: true` custom claim)
export function DeveloperGuard() {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  const [claimChecked, setClaimChecked] = React.useState(false);
  const [hasClaim, setHasClaim] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || !user) {
      setClaimChecked(true);
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) { setClaimChecked(true); return; }

    currentUser.getIdTokenResult(false).then((result) => {
      setHasClaim(result.claims.developer === true);
      setClaimChecked(true);
    }).catch(() => {
      setClaimChecked(true);
    });
  }, [isAuthenticated, user]);

  if (isLoading || !claimChecked) {
    return <div className="h-screen flex items-center justify-center text-slate-400 text-sm">Verifying developer access...</div>;
  }

  const DEVELOPER_EMAIL = 'webhub2811@gmail.com';
  const emailOk = user?.email?.toLowerCase() === DEVELOPER_EMAIL;

  if (!isAuthenticated || !emailOk || !hasClaim) {
    if (isAuthenticated && user) {
      logSecurityEvent({
        action: 'unauthorized_developer_access_attempt',
        route: location.pathname,
        uid: user?.uid,
        email: user?.email,
      });
      toast.error('Developer access only.');
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

