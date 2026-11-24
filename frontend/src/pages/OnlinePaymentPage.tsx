/**
 * OnlinePaymentPage — Olive Pizza Customer App
 *
 * Dedicated page for all non-COD, non-UPI-intent payment flows.
 * Reachable ONLY via programmatic navigate('/online-payment', { state: { orderContext } }).
 * Direct URL access or missing orderContext → redirect to /checkout.
 *
 * Supported providers: razorpay | phonepe | cashfree | mock
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Clock,
  Headphones,
  Receipt,
  Zap,
  Lock,
} from 'lucide-react';
import { fetchApi } from '../lib/config';
import { auth } from '../lib/firebase';
import { useCartStore } from '../lib/store';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  menuItemId?: string;
  id?: string;
  _id?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  crust?: string;
  image?: string;
  variant?: string;
  addons?: unknown[];
}

interface OrderContext {
  orderId: string;
  serverValidatedAmount: number;  // Always use this — never client total
  itemCount: number;
  itemTotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxes: number;
  finalTotal: number;
  paymentMethod: string;          // 'razorpay' | 'phonepe' | 'cashfree' | 'mock' | 'upi'
  paymentMethodLabel: string;
  items: OrderItem[];
  deliveryAddress: string;
  couponCode?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  currency?: string;
  deliveryType?: 'delivery' | 'pickup';
  addressDetails?: unknown;
  location?: { lat: number; lng: number };
  franchiseId?: string;
  branchId?: string;
  // Gateway-specific fields returned by create-intent (may not exist on initial context)
  razorpayKeyId?: string;
  gatewayOrderId?: string;        // Razorpay order_id
  gatewayRedirectUrl?: string;    // PhonePe / Cashfree redirect URL
  providerPaymentId?: string;
}

type PaymentState =
  | 'idle'
  | 'initiating'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'pending';

// ─── Animated Gradient Ring ───────────────────────────────────────────────

const GradientRing: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <div
    className="relative flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    {/* Outer rotating ring */}
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: 'conic-gradient(from 0deg, #d4af37, #4ade80, #22c55e, #064E3B, #d4af37)',
        animation: 'spin 1.4s linear infinite',
        borderRadius: '50%',
      }}
    />
    {/* Inner mask */}
    <div
      className="absolute rounded-full bg-[#061a0f]"
      style={{ inset: 6 }}
    />
    {/* Centre icon */}
    <div className="relative z-10 flex items-center justify-center">
      <Lock className="w-8 h-8 text-champagne" />
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── Success Checkmark ────────────────────────────────────────────────────

const SuccessCheck: React.FC = () => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
    className="w-28 h-28 rounded-full flex items-center justify-center"
    style={{
      background: 'radial-gradient(circle at center, #22c55e 0%, #15803d 60%, #14532d 100%)',
      boxShadow: '0 0 60px rgba(34,197,94,0.5), 0 0 120px rgba(34,197,94,0.2)',
    }}
  >
    <motion.div
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
    </motion.div>
  </motion.div>
);

// ─── Glass Card ──────────────────────────────────────────────────────────

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`relative overflow-hidden rounded-3xl ${className}`}
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(212,175,55,0.25)',
      boxShadow:
        '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(212,175,55,0.15)',
    }}
  >
    {/* Gradient border highlight */}
    <div
      className="absolute inset-x-0 top-0 h-px"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)',
      }}
    />
    {children}
  </div>
);

// ─── Amount Row ───────────────────────────────────────────────────────────

const AmountRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
  discount?: boolean;
}> = ({ label, value, highlight = false, discount = false }) => (
  <div className="flex justify-between items-center">
    <span
      className={`text-sm ${
        highlight ? 'text-white font-bold' : 'text-white/60'
      }`}
    >
      {label}
    </span>
    <span
      className={`text-sm font-bold ${
        discount ? 'text-green-400' : highlight ? 'text-champagne text-lg' : 'text-white/80'
      }`}
    >
      {value}
    </span>
  </div>
);

// ─── Payment Method Badge ─────────────────────────────────────────────────

const METHOD_META: Record<string, { label: string; color: string; emoji: string }> = {
  razorpay: { label: 'Razorpay', color: '#3395FF', emoji: '💳' },
  phonepe: { label: 'PhonePe', color: '#5f259f', emoji: '📱' },
  cashfree: { label: 'Cashfree', color: '#00BAF2', emoji: '💸' },
  mock: { label: 'Test Gateway', color: '#f59e0b', emoji: '🧪' },
  upi: { label: 'UPI', color: '#22c55e', emoji: '📲' },
  card: { label: 'Card', color: '#3b82f6', emoji: '💳' },
  wallet: { label: 'Wallet', color: '#8b5cf6', emoji: '👜' },
};

const PaymentBadge: React.FC<{ method: string; label: string }> = ({ method, label }) => {
  const meta = METHOD_META[method] ?? { label, color: '#d4af37', emoji: '💰' };
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
      style={{
        background: `${meta.color}20`,
        border: `1px solid ${meta.color}50`,
        color: meta.color,
      }}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </div>
  );
};

// ─── Razorpay Script Loader ───────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function OnlinePaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── State Guard ──────────────────────────────────────────────────────────
  const orderContext = location.state?.orderContext as OrderContext | undefined;

  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [activeMethod, setActiveMethod] = useState<string>(
    orderContext?.paymentMethod || 'razorpay'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // For polling during 'pending' state
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 10; // 10 × 3s = 30s

  // Duplicate payment prevention
  const lockKey = orderContext ? `op_payment_lock_${orderContext.orderId}` : null;

  // ── Mount Guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orderContext || !orderContext.orderId || !orderContext.serverValidatedAmount) {
      navigate('/checkout', { replace: true });
      return;
    }

    // COD should not reach here
    if (
      orderContext.paymentMethod === 'cod' ||
      orderContext.paymentMethod === 'upi_intent'
    ) {
      navigate('/checkout', { replace: true });
      return;
    }

    // Duplicate payment prevention
    if (lockKey) {
      const existing = sessionStorage.getItem(lockKey);
      if (existing === 'processing') {
        // Page refreshed during processing → poll for status
        setPaymentState('pending');
        startPolling(orderContext.orderId);
        return;
      }
      if (existing === 'done') {
        // Already processed, navigate to tracking
        navigate(`/order-tracking/${orderContext.orderId}`, { replace: true });
        return;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Back Navigation Safety ───────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (paymentState === 'processing' || paymentState === 'initiating') {
        e.preventDefault();
        e.returnValue = 'Payment in progress. Please wait.';
      }
    };
    const handlePopState = (e: PopStateEvent) => {
      if (paymentState === 'processing' || paymentState === 'initiating') {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        toast('Payment in progress. Please wait.', { icon: '🔒' });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [paymentState]);

  // ── Polling ──────────────────────────────────────────────────────────────
  const startPolling = useCallback((orderId: string) => {
    pollCountRef.current = 0;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        clearInterval(pollIntervalRef.current!);
        // Give up — navigate to tracking and let the user check
        navigate(`/order-tracking/${orderId}`, { replace: true });
        return;
      }

      try {
        const res = await fetchApi(`/api/payment/status/${orderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.status === 'paid' || data?.status === 'completed' || data?.verified) {
          clearInterval(pollIntervalRef.current!);
          useCartStore.getState().clearCart();
          if (lockKey) sessionStorage.setItem(lockKey, 'done');
          setPaymentState('success');
          setTimeout(() => navigate(`/order-success/${orderId}`, { replace: true }), 2500);
        } else if (data?.status === 'failed' || data?.status === 'cancelled') {
          clearInterval(pollIntervalRef.current!);
          setPaymentState('failed');
          setErrorMessage('Payment was not completed. Please try again.');
        }
      } catch {
        // Network error — keep polling
      }
    }, 3000);
  }, [lockKey, navigate]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── Initiate Payment ─────────────────────────────────────────────────────
  const initiatePayment = useCallback(async () => {
    if (!orderContext) return;

    if (retryCount >= MAX_RETRIES) {
      toast.error('Maximum retry attempts reached. Please contact support.');
      return;
    }

    try {
      setPaymentState('initiating');
      if (lockKey) sessionStorage.setItem(lockKey, 'processing');

      // Get auth token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required. Please sign in and try again.');
      }
      const token = await currentUser.getIdToken();

      // Call backend create-intent
      const intentRes = await fetchApi('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderContext.items.map((item) => ({
            menuItemId: item.menuItemId || item.id || item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size: item.variant || item.size || 'regular',
            crust: item.crust || 'normal',
            image: item.image || '',
          })),
          paymentMethod: activeMethod,
          deliveryAddress: orderContext.deliveryAddress,
          customerName: orderContext.customerName,
          customerPhone: orderContext.customerPhone,
          customerEmail: orderContext.customerEmail,
          couponCode: orderContext.couponCode || null,
          orderId: orderContext.orderId,
        }),
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json().catch(() => ({}));
        throw new Error(
          errData?.error ||
            `Payment gateway returned ${intentRes.status}: ${intentRes.statusText}`
        );
      }

      const intentData = await intentRes.json();

      // ── Route by provider ──────────────────────────────────────────────
      const method = activeMethod;

      if (method === 'mock') {
        await handleMockPayment(intentData, token);
        return;
      }

      if (method === 'razorpay') {
        await handleRazorpay(intentData, token);
        return;
      }

      if (method === 'phonepe' || method === 'cashfree') {
        const redirectUrl = intentData.gatewayRedirectUrl || intentData.redirectUrl;
        if (!redirectUrl) {
          throw new Error(
            `${method === 'phonepe' ? 'PhonePe' : 'Cashfree'} redirect URL not returned by server.`
          );
        }
        setPaymentState('processing');
        // Redirect to gateway
        window.location.href = redirectUrl;
        return;
      }

      // Fallback for UPI-type methods routed here
      const redirectUrl = intentData.gatewayRedirectUrl || intentData.redirectUrl;
      if (redirectUrl) {
        setPaymentState('processing');
        window.location.href = redirectUrl;
        return;
      }

      throw new Error(`Unsupported payment method: ${method}. No redirect URL provided.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment initiation failed.';
      console.error('[OnlinePaymentPage] initiatePayment error:', err);
      setErrorMessage(msg);
      setPaymentState('failed');
      if (lockKey) sessionStorage.removeItem(lockKey);
    }
  }, [orderContext, retryCount, lockKey, activeMethod]);

  // ── Complete Order Submission ───────────────────────────────────────────
  const completeOrderSubmission = async (
    verifiedPaymentId: string,
    token: string
  ): Promise<string> => {
    try {
      const res = await fetchApi('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': `ord_pay_${orderContext!.orderId}`,
        },
        body: JSON.stringify({
          items: orderContext!.items.map((item) => ({
            menuItemId: item.menuItemId || item.id || item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size: item.variant || item.size || 'regular',
            crust: item.crust || 'normal',
            image: item.image || '',
            addons: item.addons || [],
          })),
          paymentMethod: activeMethod,
          paymentId: verifiedPaymentId,
          deliveryType: orderContext!.deliveryType || 'delivery',
          address: orderContext!.deliveryAddress || 'Delivery',
          addressDetails: orderContext!.addressDetails,
          location: orderContext!.location,
          lat: orderContext!.location?.lat,
          lng: orderContext!.location?.lng,
          contactPhone: orderContext!.customerPhone,
          orderSource: 'ONLINE',
          franchiseId: orderContext!.franchiseId,
          branchId: orderContext!.branchId,
          couponCode: orderContext!.couponCode || null,
        }),
      });

      const data =
        typeof (res as any)?.json === 'function'
          ? await (res as any).json().catch(() => null)
          : res;
      useCartStore.getState().clearCart();
      return (data?.orderId as string) || orderContext!.orderId;
    } catch (err) {
      console.warn('[OnlinePaymentPage] /api/orders sync notice:', err);
      useCartStore.getState().clearCart();
      return orderContext!.orderId;
    }
  };

  // ── Mock Payment Handler ─────────────────────────────────────────────────
  const handleMockPayment = async (
    intentData: Record<string, unknown>,
    token: string
  ) => {
    setPaymentState('processing');
    const mockProviderPaymentId = 'mock_pay_' + Date.now();

    // Verify on backend to confirm PostgreSQL capture
    try {
      if (intentData?.paymentId) {
        await fetchApi('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentId: intentData.paymentId,
            providerPaymentId: mockProviderPaymentId,
          }),
        });
      }
    } catch (vErr) {
      console.warn('[OnlinePaymentPage] Mock payment verify note:', vErr);
    }

    const confirmedOrderId = await completeOrderSubmission(
      (intentData?.paymentId as string) || mockProviderPaymentId,
      token
    );
    if (lockKey) sessionStorage.setItem(lockKey, 'done');
    setPaymentState('success');
    setTimeout(
      () => navigate(`/order-success/${confirmedOrderId}`, { replace: true }),
      2500
    );
  };

  // ── Razorpay Handler ─────────────────────────────────────────────────────
  const handleRazorpay = async (
    intentData: Record<string, unknown>,
    token: string
  ) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error(
        'Razorpay checkout.js failed to load. Check your internet connection and try again.'
      );
    }

    const razorpayKeyId =
      (intentData.razorpayKeyId as string) ||
      (intentData.keyId as string) ||
      orderContext!.razorpayKeyId;

    const gatewayOrderId =
      (intentData.gatewayOrderId as string) ||
      (intentData.orderId as string) ||
      (intentData.gateway_order_id as string);

    if (!razorpayKeyId) {
      throw new Error('Razorpay Key ID not returned by server. Cannot open checkout.');
    }
    if (!gatewayOrderId) {
      throw new Error('Razorpay gateway order_id not returned by server. Cannot open checkout.');
    }

    setPaymentState('processing');

    return new Promise<void>((resolve, reject) => {
      const rzp = new (window as any).Razorpay({
        key: razorpayKeyId,
        amount: Math.round(orderContext!.serverValidatedAmount * 100), // paise
        currency: orderContext!.currency || 'INR',
        name: 'Olive Pizza',
        description: `Order #${orderContext!.orderId}`,
        order_id: gatewayOrderId,
        prefill: {
          name: orderContext!.customerName,
          email: orderContext!.customerEmail,
          contact: orderContext!.customerPhone,
        },
        theme: { color: '#064E3B' },
        modal: {
          ondismiss: () => {
            setPaymentState('cancelled');
            if (lockKey) sessionStorage.removeItem(lockKey);
            resolve();
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Verify on backend
            const verifyRes = await fetchApi('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                paymentId: intentData.paymentId,
                providerPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok || !verifyData?.verified) {
              throw new Error(
                verifyData?.error ||
                  `Razorpay payment verification failed (HTTP ${verifyRes.status}).`
              );
            }

            const confirmedOrderId = await completeOrderSubmission(
              (intentData.paymentId as string) || response.razorpay_payment_id,
              token
            );
            if (lockKey) sessionStorage.setItem(lockKey, 'done');
            setPaymentState('success');
            setTimeout(
              () => navigate(`/order-success/${confirmedOrderId}`, { replace: true }),
              2500
            );
            resolve();
          } catch (vErr) {
            const msg =
              vErr instanceof Error ? vErr.message : 'Payment verification failed.';
            setErrorMessage(msg);
            setPaymentState('failed');
            if (lockKey) sessionStorage.removeItem(lockKey);
            reject(vErr);
          }
        },
      });

      rzp.on(
        'payment.failed',
        (failResponse: { error: { description: string; code: string; reason: string } }) => {
          const desc =
            failResponse?.error?.description ||
            failResponse?.error?.reason ||
            'Razorpay payment failed.';
          setErrorMessage(`Razorpay payment failed: ${desc} (code: ${failResponse?.error?.code ?? 'unknown'})`);
          setPaymentState('failed');
          if (lockKey) sessionStorage.removeItem(lockKey);
          reject(new Error(desc));
        }
      );

      rzp.open();
    });
  };

  // ── Retry ────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setRetryCount((c) => c + 1);
    setErrorMessage('');
    setPaymentState('idle');
  };

  // ── Redirect if no context ────────────────────────────────────────────────
  if (!orderContext || !orderContext.orderId || !orderContext.serverValidatedAmount) {
    return null; // Guard already handled via useEffect redirect
  }

  const amount = orderContext.serverValidatedAmount;

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pb-16 overflow-y-auto"
      style={{
        background:
          'radial-gradient(ellipse at top left, #0a3320 0%, #061a0f 40%, #020d05 70%, #000 100%)',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 w-full px-4 py-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,13,5,0.98) 0%, transparent 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {paymentState !== 'processing' && paymentState !== 'initiating' && (
          <button
            type="button"
            onClick={() => {
              if (paymentState === 'idle' || paymentState === 'failed' || paymentState === 'cancelled') {
                navigate('/checkout', { replace: true });
              }
            }}
            className="p-2.5 rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Back to checkout"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-black text-white tracking-tight">Secure Payment</h1>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Lock className="w-3 h-3" />
            <span>256-bit SSL Encrypted</span>
          </div>
        </div>
        <PaymentBadge
          method={activeMethod}
          label={activeMethod.toUpperCase()}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-sm mx-auto px-4 pt-2 space-y-4">

        {/* ── IDLE — Order Summary ──────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {paymentState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="space-y-4"
            >
              {/* Amount Hero */}
              <GlassCard className="p-6 text-center">
                <p className="text-white/50 text-sm mb-1">Total to Pay</p>
                <motion.p
                  key={amount}
                  initial={{ scale: 1.15, color: '#d4af37' }}
                  animate={{ scale: 1, color: '#d4af37' }}
                  className="text-5xl font-black text-champagne mb-1"
                >
                  ₹{amount}
                </motion.p>
                <p className="text-white/40 text-xs">
                  {orderContext.itemCount} item{orderContext.itemCount !== 1 ? 's' : ''}
                </p>
              </GlassCard>

              {/* Breakdown */}
              <GlassCard className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-champagne/60" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    Order Breakdown
                  </span>
                </div>
                <AmountRow label="Item Total" value={`₹${orderContext.itemTotal}`} />
                {orderContext.discountAmount > 0 && (
                  <AmountRow
                    label={`Discount${orderContext.couponCode ? ` (${orderContext.couponCode})` : ''}`}
                    value={`-₹${orderContext.discountAmount}`}
                    discount
                  />
                )}
                <AmountRow label="Taxes (5% GST)" value={`₹${orderContext.taxes}`} />
                <AmountRow label="Delivery Fee" value={`₹${orderContext.deliveryFee}`} />
                <div className="h-px bg-white/10 my-1" />
                <AmountRow label="Grand Total" value={`₹${amount}`} highlight />
              </GlassCard>

              {/* Items List */}
              {orderContext.items.length > 0 && (
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-champagne/60" />
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
                      Items
                    </span>
                  </div>
                  <div className="space-y-2">
                    {orderContext.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-white/70 truncate max-w-[180px]">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-white/60 font-semibold">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Trust badges */}
              <div className="flex gap-2 justify-center">
                {['SSL Secured', 'No Fees', 'PCI Safe'].map((b) => (
                  <div
                    key={b}
                    className="flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-2.5 py-1 rounded-full"
                  >
                    <ShieldCheck className="w-3 h-3 text-green-500/60" />
                    {b}
                  </div>
                ))}
              </div>

              {/* Gateway Switcher Tabs */}
              <GlassCard className="p-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                    Payment Gateway
                  </span>
                  <span className="text-[10px] text-champagne font-extrabold uppercase">
                    {activeMethod}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'razorpay', label: 'Razorpay', emoji: '💳' },
                    { id: 'phonepe', label: 'PhonePe', emoji: '📱' },
                    { id: 'cashfree', label: 'Cashfree', emoji: '💸' },
                    { id: 'mock', label: 'Test Mode', emoji: '🧪' },
                  ].map((gw) => {
                    const isSelected = activeMethod === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setActiveMethod(gw.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-champagne/20 text-champagne border border-champagne/50 shadow-sm'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="text-base mb-0.5">{gw.emoji}</span>
                        <span className="text-[10px] truncate max-w-full">{gw.label}</span>
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Pay Now Button */}
              <motion.button
                type="button"
                onClick={initiatePayment}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-black text-base text-primary-950 cursor-pointer min-h-[52px] flex items-center justify-center gap-2 shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #d4af37 100%)',
                  boxShadow: '0 4px 24px rgba(212,175,55,0.5), 0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <Lock className="w-4 h-4" />
                Pay ₹{amount} Now
                <CreditCard className="w-4 h-4" />
              </motion.button>

              <p className="text-center text-xs text-white/30 pb-2">
                By paying, you agree to our{' '}
                <a href="/terms" className="underline text-white/40 hover:text-white/60">
                  Terms
                </a>{' '}
                &amp;{' '}
                <a href="/refund-policy" className="underline text-white/40 hover:text-white/60">
                  Refund Policy
                </a>
              </p>
            </motion.div>
          )}

          {/* ── INITIATING / PROCESSING — Premium Loader ───────────────── */}
          {(paymentState === 'initiating' || paymentState === 'processing') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center"
            >
              {/* Animated gradient ring */}
              <div className="relative">
                <GradientRing size={130} />
                {/* Pulse rings */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'transparent',
                    border: '2px solid rgba(212,175,55,0.3)',
                    animation: 'pulse-ring 2s ease-out infinite',
                    transform: 'scale(1)',
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'transparent',
                    border: '2px solid rgba(212,175,55,0.15)',
                    animation: 'pulse-ring 2s ease-out infinite 0.5s',
                  }}
                />
                <style>{`
                  @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.8); opacity: 0; }
                  }
                `}</style>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">
                  {paymentState === 'initiating'
                    ? 'Connecting to Gateway…'
                    : 'Processing Payment…'}
                </h2>
                <p className="text-white/50 text-sm max-w-xs mx-auto">
                  {paymentState === 'initiating'
                    ? 'Setting up a secure session. Please wait.'
                    : 'Please do not close this tab or press back.'}
                </p>
              </div>

              {/* Animated progress bar */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #064E3B, #d4af37)',
                  }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <GlassCard className="p-4 w-full max-w-xs">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Secure Session Active</p>
                    <p className="text-[11px] text-white/40">
                      ₹{amount} · {orderContext.paymentMethodLabel}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── PENDING — Webhook Confirmation ─────────────────────────── */}
          {paymentState === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4"
            >
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle at center, #0ea5e9 0%, #0369a1 60%)',
                    boxShadow: '0 0 40px rgba(14,165,233,0.4)',
                  }}
                >
                  <Clock className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">We're Confirming…</h2>
                <p className="text-white/50 text-sm">
                  Your payment is being verified with the gateway. This usually takes a few
                  seconds.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Checking every 3 seconds…
              </div>
              <GlassCard className="p-4 w-full max-w-xs">
                <p className="text-xs text-white/50 text-center">
                  Please do not close this page. You'll be redirected automatically once
                  confirmed.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* ── SUCCESS ──────────────────────────────────────────────────── */}
          {paymentState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center"
            >
              <SuccessCheck />

              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black text-white"
                >
                  Payment Successful!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/50 text-sm"
                >
                  ₹{amount} paid · Order #{orderContext.orderId.slice(-6).toUpperCase()}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2 text-xs text-white/40"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Redirecting to order tracking…
              </motion.div>
            </motion.div>
          )}

          {/* ── FAILED ───────────────────────────────────────────────────── */}
          {paymentState === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-2"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at center, #ef4444 0%, #991b1b 60%)',
                  boxShadow: '0 0 40px rgba(239,68,68,0.4)',
                }}
              >
                <AlertCircle className="w-10 h-10 text-white" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Payment Failed</h2>
                <GlassCard className="p-4 max-w-xs mx-auto">
                  <p className="text-sm text-red-300 text-left leading-relaxed">
                    {errorMessage || 'An unexpected error occurred. Your account was not charged.'}
                  </p>
                </GlassCard>
              </div>

              <div className="space-y-3 w-full max-w-xs">
                {retryCount < MAX_RETRIES ? (
                  <motion.button
                    type="button"
                    onClick={handleRetry}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-2xl font-black text-primary-950 cursor-pointer min-h-[52px] flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #d4af37, #f0d060)',
                      boxShadow: '0 4px 24px rgba(212,175,55,0.4)',
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Payment ({MAX_RETRIES - retryCount} left)
                  </motion.button>
                ) : (
                  <div className="text-xs text-white/40 text-center">
                    Maximum retries reached.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/checkout', { replace: true })}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/70 border border-white/15 hover:bg-white/5 transition-colors cursor-pointer min-h-[48px]"
                >
                  Back to Checkout
                </button>

                <a
                  href="/contact"
                  className="flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors py-2"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Contact Support
                </a>
              </div>
            </motion.div>
          )}

          {/* ── CANCELLED ────────────────────────────────────────────────── */}
          {paymentState === 'cancelled' && (
            <motion.div
              key="cancelled"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4"
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at center, #f59e0b 0%, #b45309 60%)',
                  boxShadow: '0 0 40px rgba(245,158,11,0.4)',
                }}
              >
                <span className="text-4xl">↩</span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white mb-2">Payment Cancelled</h2>
                <p className="text-white/50 text-sm">
                  You cancelled the payment. Your cart is still saved.
                </p>
              </div>

              <div className="space-y-3 w-full max-w-xs">
                <motion.button
                  type="button"
                  onClick={() => setPaymentState('idle')}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-black text-primary-950 cursor-pointer min-h-[52px] flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37, #f0d060)',
                    boxShadow: '0 4px 24px rgba(212,175,55,0.4)',
                  }}
                >
                  Try Again
                </motion.button>
                <button
                  type="button"
                  onClick={() => navigate('/checkout', { replace: true })}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/70 border border-white/15 hover:bg-white/5 transition-colors cursor-pointer min-h-[48px]"
                >
                  Back to Checkout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
