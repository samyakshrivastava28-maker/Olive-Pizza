import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, CreditCard, ChevronLeft, Ticket, Navigation, Star, TrendingUp, CheckCircle, ShieldCheck, Receipt, AlertTriangle, AlertCircle, ShoppingBag, Bike } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuthStore, useCartStore } from '../lib/store';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { usePWA } from '../lib/usePWA';
import { useStoreStatus } from '../lib/useStoreStatus';
import toast from 'react-hot-toast';
import PaymentMethodOverlay from '../components/checkout/PaymentMethodOverlay';
import ProcessingOverlay from '../components/checkout/ProcessingOverlay';
import PageTransition from '../components/PageTransition';
import { openLocationModal } from '../components/location/LocationChangeModal';
const LocationPicker3D = React.lazy(() => import('../components/map/LocationPicker3D'));
import { fetchRoute } from '../services/navigationRouting.service';
import { RESTAURANT_LOCATION, MAX_DELIVERY_RADIUS_KM, fetchApi } from '../lib/config';
import { OrderingContextService } from '../lib/orderingContext';
import { calculateDistance } from '../lib/utils';
import { useDataStore } from '../lib/dataStore';
import SEO from '../components/SEO';

// Premium Checkout redesign
export default function Checkout() {
  const { items, total, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const storeStatus = useStoreStatus();
  const navigate = useNavigate();
  const { isOffline } = usePWA();

  const [address, setAddress] = useState(user?.fullAddress || '');
  const [houseNumber, setHouseNumber] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [standaloneCoupons, setStandaloneCoupons] = useState<any[]>([]);
  
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('');
  
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('idle'); // idle, processing, success
  const [orderId, setOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [checkingActiveOrder, setCheckingActiveOrder] = useState(true);
  const [deliveryAvailability, setDeliveryAvailability] = useState<{
    canAcceptDeliveries: boolean;
    availabilityStatus: 'AVAILABLE' | 'HIGH_DEMAND' | 'NO_RIDERS' | 'CLOSED';
    availabilityMessage: string;
    isRestaurantOpen: boolean;
  }>({
    canAcceptDeliveries: true,
    availabilityStatus: 'AVAILABLE',
    availabilityMessage: 'Delivery available',
    isRestaurantOpen: true,
  });

  const getInitialCoords = () => {
    const uLat = (user as any)?.lat != null ? Number((user as any).lat) : null;
    const uLng = (user as any)?.lng != null ? Number((user as any).lng) : null;
    if (uLat != null && uLng != null && !isNaN(uLat) && !isNaN(uLng)) {
      return { lat: uLat, lng: uLng };
    }
    try {
      const stored = localStorage.getItem('op_active_location');
      if (stored) {
        const parsed = JSON.parse(stored);
        const pLat = Number(parsed.lat);
        const pLng = Number(parsed.lng);
        if (!isNaN(pLat) && !isNaN(pLng)) {
          return { lat: pLat, lng: pLng };
        }
      }
    } catch {}
    return { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng };
  };

  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>(getInitialCoords);

  const [isServiceableLocation, setIsServiceableLocation] = useState<boolean>(true);
  const [serviceAreaNotice, setServiceAreaNotice] = useState<string>('');

  // Validate delivery radius whenever mapCenter changes (Enforcement Point 3)
  useEffect(() => {
    let active = true;
    const verifyRadius = async () => {
      if (!mapCenter.lat || !mapCenter.lng) return;
      const res = await OrderingContextService.resolveContext({
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        addressLine: address,
        customerId: user?.uid
      });
      if (!active) return;
      if (!res.isServiceable) {
        setIsServiceableLocation(false);
        setServiceAreaNotice(res.error || "We currently don't deliver to this location.");
      } else {
        setIsServiceableLocation(true);
        setServiceAreaNotice('');
      }
    };
    verifyRadius();
    return () => { active = false; };
  }, [mapCenter.lat, mapCenter.lng, address, user?.uid]);

  useEffect(() => {
    const handleLocationChange = (e: any) => {
      if (e.detail?.fullAddress) {
        setAddress(e.detail.fullAddress);
      }
      if (e.detail?.lat && e.detail?.lng) {
        setMapCenter({ lat: e.detail.lat, lng: e.detail.lng });
      }
    };
    window.addEventListener('location-changed', handleLocationChange as EventListener);
    return () => window.removeEventListener('location-changed', handleLocationChange as EventListener);
  }, []);

  // Auto-sync customer onboarding location or fetch GPS if address empty
  useEffect(() => {
    let activeLat = (user as any)?.lat != null ? Number((user as any).lat) : null;
    let activeLng = (user as any)?.lng != null ? Number((user as any).lng) : null;
    let activeAddr = (user as any)?.fullAddress || (user as any)?.full_address || '';

    if (!activeLat || !activeLng || !activeAddr) {
      try {
        const stored = localStorage.getItem('op_active_location');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!activeLat && !isNaN(Number(parsed.lat))) activeLat = Number(parsed.lat);
          if (!activeLng && !isNaN(Number(parsed.lng))) activeLng = Number(parsed.lng);
          if (!activeAddr && (parsed.address || parsed.fullAddress)) activeAddr = parsed.address || parsed.fullAddress;
        }
      } catch {}
    }

    if (activeLat != null && activeLng != null && !isNaN(activeLat) && !isNaN(activeLng)) {
      setMapCenter({ lat: activeLat, lng: activeLng });
    }
    if (activeAddr) {
      setAddress(activeAddr);
    } else if (!address && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Validate before blindly overwriting map center
          const distFromHq = calculateDistance(latitude, longitude, RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng);
          if (distFromHq > 25) {
            console.warn('[Checkout] Browser IP geolocation placed outside Rajnandgaon (' + distFromHq.toFixed(1) + ' km). Preserving Rajnandgaon HQ.');
            setMapCenter({ lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng });
            setAddress(RESTAURANT_LOCATION.address);
            return;
          }
          setMapCenter({ lat: latitude, lng: longitude });
          try {
            const res = await fetchApi(`/api/location/reverse-geocode?lat=${latitude}&lng=${longitude}`);
            const data = await res.json();
            const addr = data?.location?.displayName || data?.display_name;
            if (addr) setAddress(addr);
          } catch (err) {}
        },
        () => {
          // If denied, fallback to Rajnandgaon HQ
          setMapCenter({ lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng });
          setAddress(RESTAURANT_LOCATION.address);
        }
      );
    }
  }, [user]);

  // Check for active orders for this customer (Limit 1 active order at once)
  useEffect(() => {
    if (!user?.uid) {
      setCheckingActiveOrder(false);
      return;
    }
    const checkCustomerActiveOrder = async () => {
      try {
        setCheckingActiveOrder(true);
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const active = snap.docs.find(doc => {
          const s = (doc.data().status || '').toLowerCase();
          return !['delivered', 'cancelled', 'rejected', 'failed'].includes(s);
        });
        if (active) {
          setActiveOrder({ id: active.id, ...active.data() });
        } else {
          setActiveOrder(null);
        }
      } catch (err) {
        console.warn('[Checkout] Active order check notice:', err);
      } finally {
        setCheckingActiveOrder(false);
      }
    };
    checkCustomerActiveOrder();
  }, [user?.uid]);

  // Fetch Delivery Capacity & High Demand status
  useEffect(() => {
    const checkDeliveryCapacity = async () => {
      try {
        const res = await fetchApi('/api/delivery/availability');
        if (res.ok) {
          const data = await res.json();
          const availStatus = data.availabilityStatus || (data.canAcceptDeliveries ? 'AVAILABLE' : 'NO_RIDERS');
          setDeliveryAvailability({
            canAcceptDeliveries: data.canAcceptDeliveries ?? true,
            availabilityStatus: availStatus,
            availabilityMessage: data.availabilityMessage || (data.canAcceptDeliveries ? 'Delivery available' : 'Delivery unavailable'),
            isRestaurantOpen: data.isRestaurantOpen ?? true,
          });
          if (!data.canAcceptDeliveries && data.isRestaurantOpen) {
            setDeliveryType('pickup');
          }
        }
      } catch (err) {
        console.warn('[Checkout] Availability check notice:', err);
      }
    };
    checkDeliveryCapacity();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    if (user && !user.phoneSetupCompleted && !user.phone) {
      navigate('/onboarding/phone?redirect=/checkout');
      return;
    }
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // Fetch Promos (prefer cached dataStore coupons)
    const fetchPromos = async () => {
      try {
        const { coupons: storeCoupons } = useDataStore.getState();
        if (storeCoupons && storeCoupons.length > 0) {
          setStandaloneCoupons(storeCoupons);
        } else {
          const couponsSnap = await getDocs(query(collection(db, 'coupons'), where('isActive', '==', true)));
          setStandaloneCoupons(couponsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }

        const eventsSnap = await getDocs(query(collection(db, 'events'), where('isActive', '==', true)));
        const now = Date.now();
        setActiveEvents(
          eventsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((e: any) => e.startDate <= now && e.endDate >= now)
        );
      } catch (err) {}
    };
    fetchPromos();
  }, [isAuthenticated, items, navigate]);

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    const code = promoInput.trim().toUpperCase();
    let foundCoupon: any = null;

    const standaloneMatch = standaloneCoupons.find((c) => c.code === code);
    if (standaloneMatch) {
      foundCoupon = {
        code: standaloneMatch.code,
        type: standaloneMatch.type === 'percentage' ? 'percent' : 'flat',
        value: standaloneMatch.discountValue,
      };
    }
    
    if (!foundCoupon) {
      for (const event of activeEvents) {
        if (event.coupons) {
          const match = event.coupons.find((c: any) => c.code === code);
          if (match) { foundCoupon = match; break; }
        }
      }
    }

    if (!foundCoupon) {
      toast.error('Invalid or expired promo code.');
      setAppliedPromo(null);
      return;
    }
    setAppliedPromo(foundCoupon);
    toast.success('Coupon applied!');
  };

  const discountAmount = appliedPromo
    ? appliedPromo.type === 'percent'
      ? Math.round(total * (appliedPromo.value / 100))
      : appliedPromo.value
    : 0;
  const deliveryFee = deliveryType === 'delivery' ? 40 : 0;
  const taxes = Math.round(total * 0.05);
  const finalTotal = Math.max(0, total - discountAmount) + deliveryFee + taxes;

  const handlePaymentSelect = (method: string) => {
    setSelectedPayment(method);
    setShowPayment(false);
  };

  const handlePlaceOrder = async () => {
    if (activeOrder) {
      toast.error('You already have an active order in progress. Please wait until it is delivered before placing another.');
      return;
    }

    if (!storeStatus.isRestaurantOpen && !deliveryAvailability.isRestaurantOpen) {
      toast.error(`Restaurant is currently closed. ${storeStatus.openingTime && storeStatus.closingTime ? `Business hours: ${storeStatus.openingTime} - ${storeStatus.closingTime}` : 'Please check back soon.'}`);
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAvailability.canAcceptDeliveries) {
      toast.error(deliveryAvailability.availabilityMessage || 'Delivery is currently unavailable.');
      return;
    }

    if (!address.trim() && deliveryType === 'delivery') {
      toast.error('Please enter a delivery address');
      return;
    }

    if (deliveryType === 'delivery') {
      // Enforcement Point 3: Cart / checkout start (re-verify)
      const checkoutVal = await OrderingContextService.validateCheckout({
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        address,
        items
      });

      if (!checkoutVal.serviceable) {
        toast.error(checkoutVal.error || "We currently don't deliver to this location.");
        return;
      }
    }

    const effectivePayment = selectedPayment || 'cod';
    
    navigate('/recheck-order', {
      state: {
        items,
        address,
        location: mapCenter,
        addressDetails: { houseNumber, apartment, landmark, instructions },
        deliveryType,
        paymentMethod: effectivePayment,
        finalTotal,
        discountAmount,
        deliveryFee,
        taxes,
        total,
        appliedPromo,
        couponCode: appliedPromo?.code || null
      }
    });
  };

  // Dynamic recommended items for cross-selling sourced from store products
  const { products } = useDataStore();
  const currentItemIds = new Set(items.map(i => i.id || (i as any).menuItemId));
  const recommendedProducts = (products || [])
    .filter(p => p && p.id && !currentItemIds.has(p.id) && p.isAvailable !== false && p.isActive !== false)
    .slice(0, 6)
    .map(p => ({
      id: p.id,
      name: p.name || 'Delicious Item',
      price: typeof p.price === 'number' ? p.price : (p.basePrice || p.sizes?.[0]?.price || 99),
      image: p.image || p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'
    }));

  // Quick delivery instruction chips
  const QUICK_INSTRUCTION_CHIPS = [
    'Leave at door',
    'Don’t ring bell',
    'Avoid calling',
    'Hand over to guard',
    'Call upon arrival'
  ];

  const handleChipClick = (chip: string) => {
    if (instructions.includes(chip)) return;
    setInstructions(prev => prev ? `${prev}, ${chip}` : chip);
  };

  return (
    <>
      <SEO title="Secure Checkout" noIndex={true} />
      <PageTransition className="min-h-screen bg-[#FAF8F5] text-slate-900 font-sans pb-36">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Checkout</h1>
            <p className="text-xs text-slate-500 font-medium">{items.length} items • ₹{finalTotal}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* ── Active Order Warning Banner (1 order at a time policy) ── */}
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 border border-amber-300 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700 font-bold text-lg shrink-0">
                ⚠️
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-900">
                  Active Order in Progress {activeOrder.dailyOrderNumber ? `(#${activeOrder.dailyOrderNumber})` : ''}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 capitalize">
                  Status: <span className="font-bold text-amber-950">{activeOrder.status?.replace(/_/g, ' ') || 'Preparing'}</span>. Please wait until delivered to place a new order.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
              className="px-3.5 py-2 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 transition-transform active:scale-95 shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Track</span>
            </button>
          </motion.div>
        )}

        {/* ── Delivery Availability Alert Banners ── */}
        {!deliveryAvailability.isRestaurantOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-start gap-3 text-red-800 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Restaurant Closed</h4>
              <p className="text-xs text-red-700 mt-0.5">
                Olive Pizza is currently closed. {storeStatus.openingTime && storeStatus.closingTime ? `Business hours: ${storeStatus.openingTime} - ${storeStatus.closingTime}.` : 'We will open shortly.'}
              </p>
            </div>
          </motion.div>
        ) : deliveryAvailability.availabilityStatus === 'HIGH_DEMAND' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-300 rounded-3xl p-4 flex items-start gap-3 text-amber-800 shadow-xs"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">Delivery Temporarily Unavailable</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Delivery temporarily unavailable due to high demand. All delivery partners are currently assigned. You can switch to Store Pickup or check back shortly.
              </p>
            </div>
          </motion.div>
        ) : deliveryAvailability.availabilityStatus === 'NO_RIDERS' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-start gap-3 text-red-800 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Delivery Unavailable</h4>
              <p className="text-xs text-red-700 mt-0.5">
                Delivery unavailable. No delivery partners are currently available. You can opt for Store Pickup.
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* ── Delivery Radius Block Banner (Enforcement Point 3) ── */}
        {deliveryType === 'delivery' && !isServiceableLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-start gap-3 text-red-800 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Delivery Unavailable</h4>
              <p className="text-xs text-red-700 mt-0.5">
                We currently don't deliver to this location.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Order Mode Selector (Delivery vs Store Pickup) ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-3 flex gap-3 shadow-xs">
          <button
            type="button"
            onClick={() => {
              if (!deliveryAvailability.canAcceptDeliveries) {
                toast.error(deliveryAvailability.availabilityMessage || 'Delivery is currently unavailable');
                return;
              }
              setDeliveryType('delivery');
            }}
            className={`flex-1 p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
              !deliveryAvailability.canAcceptDeliveries
                ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                : deliveryType === 'delivery'
                ? 'bg-primary-600 border-primary-600 text-champagne shadow-sm font-bold'
                : 'bg-[#FAF8F5] border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <Bike className="w-5 h-5" />
            <span className="text-xs font-bold">🛵 Home Delivery</span>
            {!deliveryAvailability.canAcceptDeliveries && (
              <span className="text-[10px] text-amber-600 font-bold">
                {deliveryAvailability.availabilityStatus === 'HIGH_DEMAND' ? 'High Demand' : 'Unavailable'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDeliveryType('pickup')}
            className={`flex-1 p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
              deliveryType === 'pickup'
                ? 'bg-primary-600 border-primary-600 text-champagne shadow-sm font-bold'
                : 'bg-[#FAF8F5] border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-bold">🛍️ Store Pickup</span>
            <span className={`text-[10px] font-bold ${deliveryType === 'pickup' ? 'text-champagne/90' : 'text-primary-700'}`}>Ready in 15m • Free</span>
          </button>
        </div>

        {/* ── Customer Information & Address Card (for Delivery) ── */}
        {deliveryType === 'delivery' ? (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white border border-slate-200 rounded-3xl p-5 relative overflow-hidden shadow-xs">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
              <MapPin className="w-5 h-5 text-primary-600" /> 1. Delivery Location
            </h2>
            <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-200 mb-4 relative overflow-hidden h-64 flex flex-col">
              <div className="absolute inset-0 z-0">
                <React.Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-slate-500 font-medium">Loading 3D Map...</div>}>
                  <LocationPicker3D
                    initialCenter={mapCenter}
                    onChange={({lat, lng, address: reverseAddr}) => {
                      setMapCenter({lat, lng});
                      if (reverseAddr) setAddress(reverseAddr);
                    }}
                    className="w-full h-full"
                  />
                </React.Suspense>
              </div>
              <div className="relative z-10 flex flex-col gap-3 mt-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-1 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-600" /> Pinned Address
                    </p>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Drag map or enter complete address..."
                      className="w-full bg-transparent text-slate-800 text-xs resize-none focus:outline-none placeholder:text-slate-400"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2 relative z-10 mb-6">
                <button 
                 type="button"
                 onClick={() => openLocationModal()} 
                 className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" /> Saved / Search
                </button>
                <button 
                 type="button"
                 onClick={() => {
                   toast('Drag the map to set your exact location', { icon: '🗺️' });
                 }} 
                 className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit on Map
                </button>
                <button 
                 type="button"
                 onClick={() => {
                     if (navigator.geolocation) {
                       const t = toast.loading('Locating...');
                       navigator.geolocation.getCurrentPosition(
                         async (pos) => {
                           const { latitude, longitude } = pos.coords;
                           const distFromHq = calculateDistance(latitude, longitude, RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng);
                           if (distFromHq > 25) {
                             toast.error(`Your device GPS (${distFromHq.toFixed(1)} km away) is outside Rajnandgaon delivery radius.`, { id: t, duration: 4000 });
                             return;
                           }
                           setMapCenter({lat: latitude, lng: longitude});
                           try {
                             const res = await fetchApi(`/api/location/reverse-geocode?lat=${latitude}&lng=${longitude}`);
                             const data = await res.json();
                             const addr = data?.location?.displayName || data?.display_name;
                             if (addr) setAddress(addr);
                           } catch (err) {}
                           toast.success('Location updated via GPS!', { id: t });
                         },
                         () => toast.error('Location access denied or unavailable', { id: t })
                       );
                    } else {
                      toast.error('Geolocation not supported');
                    }
                 }} 
                 className="py-2.5 px-3 rounded-xl bg-primary-50 text-primary-800 border border-primary-200 text-xs font-bold hover:bg-primary-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-primary-700" /> GPS
                </button>
            </div>

            <div className="space-y-4 relative z-10 border-t border-slate-100 pt-5 mt-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Additional Delivery Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="House / Flat No." 
                  value={houseNumber}
                  onChange={e => setHouseNumber(e.target.value)}
                  className="bg-[#FAF8F5] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
                />
                <input 
                  type="text" 
                  placeholder="Apartment / Building" 
                  value={apartment}
                  onChange={e => setApartment(e.target.value)}
                  className="bg-[#FAF8F5] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
                />
              </div>
              <input 
                type="text" 
                placeholder="Landmark / Nearby spot" 
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
              />
              
              {/* Delivery Instructions with Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Delivery Instructions</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_INSTRUCTION_CHIPS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                        instructions.includes(chip)
                          ? 'bg-primary-50 border-primary-300 text-primary-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea 
                  placeholder="e.g. Leave at door, don't ring bell" 
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white border border-slate-200 rounded-3xl p-5 relative overflow-hidden shadow-xs">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-3 text-slate-900">
              <ShoppingBag className="w-5 h-5 text-primary-600" /> Store Pickup Location
            </h2>
            <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-900 text-sm">Olive Pizza Gourmet Kitchen</p>
              <p className="text-xs text-slate-600">Main Road, Rajnandgaon, Chhattisgarh 491441</p>
              <div className="flex items-center gap-2 text-xs text-primary-700 font-bold pt-2 border-t border-slate-200">
                <Clock className="w-4 h-4" />
                <span>Estimated preparation time: 15-20 minutes</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Payment Method Section */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
           <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
             <CreditCard className="w-5 h-5 text-primary-600" /> 2. Payment Method
           </h2>
           {selectedPayment ? (
             <div className="flex justify-between items-center bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-600 text-champagne rounded-xl shadow-xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-primary-950 uppercase text-xs sm:text-sm">
                    {selectedPayment === 'card' ? 'Credit / Debit Card' : 
                     selectedPayment === 'upi_phonepe' ? 'PhonePe UPI' :
                     selectedPayment === 'upi_gpay' ? 'Google Pay' :
                     selectedPayment === 'upi_paytm' ? 'Paytm UPI' :
                     selectedPayment === 'upi' ? 'UPI' : 'Cash on Delivery'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowPayment(true)} 
                  className="text-primary-700 text-xs font-bold hover:underline cursor-pointer"
                >
                  Change
                </button>
             </div>
           ) : (
             <button 
              onClick={() => setShowPayment(true)} 
              className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-700 hover:border-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-all flex items-center justify-center gap-2 font-bold text-sm cursor-pointer"
             >
                <CreditCard className="w-5 h-5 text-primary-600" /> Select Payment Method (UPI, Cards, COD)
             </button>
           )}
        </motion.div>

        {/* Coupons Section */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.15}} className="bg-white border border-[#F8E7C9] rounded-3xl p-5 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
            <Ticket className="w-5 h-5 text-primary-600" /> Offers & Benefits
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Promo Code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              className="flex-1 bg-[#FAF8F5] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
            />
            <button
              onClick={handleApplyPromo}
              className="bg-primary-600 hover:bg-primary-700 text-champagne px-5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              Apply
            </button>
          </div>
          <AnimatePresence>
            {appliedPromo && (
              <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center overflow-hidden">
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-emerald-600" />
                   <span className="text-xs text-emerald-900 font-bold">'{appliedPromo.code}' applied!</span>
                </div>
                <button onClick={() => setAppliedPromo(null)} className="text-xs text-slate-500 hover:text-red-600 cursor-pointer">Remove</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Order Summary */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
            <Receipt className="w-5 h-5 text-primary-600" /> 3. Order Summary
          </h2>
          <div className="space-y-3">
             {items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm">
                   <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">{item.quantity}x</span>
                      <span className="text-slate-800 truncate font-medium">{item.name}</span>
                   </div>
                   <span className="font-bold text-slate-900 shrink-0">₹{item.price * item.quantity}</span>
                </div>
             ))}
          </div>
          <div className="w-full h-px bg-slate-200 my-4" />
          <div className="space-y-2 text-xs sm:text-sm text-slate-500">
             <div className="flex justify-between"><span>Item Total</span><span className="text-slate-900 font-semibold">₹{total}</span></div>
             {appliedPromo && <div className="flex justify-between text-emerald-700 font-bold"><span>Discount</span><span>-₹{discountAmount}</span></div>}
             <div className="flex justify-between"><span>Taxes (5% GST)</span><span className="text-slate-900 font-semibold">₹{taxes}</span></div>
             <div className="flex justify-between"><span>Delivery Fee</span><span className="text-slate-900 font-semibold">₹{deliveryFee}</span></div>
          </div>
          <div className="w-full h-px bg-slate-200 my-4" />
          <div className="flex justify-between items-center">
             <span className="font-bold text-base sm:text-lg text-slate-900">Grand Total</span>
             <motion.span key={finalTotal} initial={{scale:1.2, color:'#064E3B'}} animate={{scale:1, color:'#064E3B'}} className="font-black text-xl sm:text-2xl text-primary-800">₹{finalTotal}</motion.span>
          </div>
        </motion.div>

        {/* Recommended Items (Cross-sell) */}
        {recommendedProducts.length > 0 && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.25}} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs overflow-hidden relative">
             <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-4 relative z-10 text-slate-900">
               <Star className="w-5 h-5 text-amber-500" /> Customers also ordered
             </h2>
             <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar relative z-10 -mx-5 px-5">
               {recommendedProducts.map((rec) => (
                 <div key={rec.id} className="min-w-[140px] bg-[#FAF8F5] rounded-2xl border border-slate-200 overflow-hidden snap-start shrink-0 flex flex-col shadow-xs">
                   <div className="h-24 w-full relative">
                     <img src={rec.image} alt={rec.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="p-3 flex flex-col justify-between flex-1">
                     <p className="text-xs font-bold text-slate-900 mb-2 line-clamp-2">{rec.name}</p>
                     <div className="flex items-center justify-between mt-auto">
                       <span className="text-xs sm:text-sm font-black text-primary-700">₹{rec.price}</span>
                       <button 
                         onClick={() => {
                           useCartStore.getState().addItem({ id: rec.id, menuItemId: rec.id, name: rec.name, price: rec.price, image: rec.image, quantity: 1 });
                           toast.success(`Added ${rec.name}`);
                         }}
                         className="bg-primary-600 hover:bg-primary-700 text-champagne w-6 h-6 rounded-md flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs active:scale-90"
                       >
                         +
                       </button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </motion.div>
        )}

      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-[max(1.2rem,env(safe-area-inset-bottom))] bg-[#064E3B] text-white backdrop-blur-2xl border-t border-champagne/30 z-[100] shadow-[0_-8px_30px_rgba(6,78,59,0.35)]">
        <div className="max-w-xl mx-auto flex gap-3 items-center">
           <button 
             onClick={() => navigate('/cart')}
             className="px-4 py-3.5 bg-white/10 text-champagne/90 font-bold rounded-2xl hover:bg-white/20 transition-colors flex items-center justify-center text-xs sm:text-sm cursor-pointer"
           >
             Back
           </button>
           {activeOrder ? (
             <button 
               onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
               className="flex-1 bg-amber-500 hover:bg-amber-600 text-dark-950 font-black rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm cursor-pointer"
             >
               <Navigation className="w-4 h-4" /> Track Active Order
             </button>
           ) : !deliveryAvailability.isRestaurantOpen && !storeStatus.isRestaurantOpen ? (
             <button 
               disabled
               className="flex-1 bg-red-950/60 border border-red-500/30 text-red-300 font-bold rounded-2xl cursor-not-allowed opacity-80 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm"
             >
               <AlertCircle className="w-4 h-4" /> Restaurant Closed
             </button>
           ) : deliveryType === 'delivery' && !deliveryAvailability.canAcceptDeliveries ? (
             <button 
               onClick={() => setDeliveryType('pickup')}
               className="flex-1 bg-amber-500 hover:bg-amber-600 text-dark-950 font-black rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm cursor-pointer"
             >
               <ShoppingBag className="w-4 h-4" /> Switch to Store Pickup
             </button>
           ) : (
             <button 
               onClick={handlePlaceOrder}
               className="flex-1 bg-champagne hover:bg-champagne/90 text-primary-950 font-black rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 py-3.5 text-xs sm:text-sm cursor-pointer transition-transform"
             >
               Confirm & Place Order • ₹{finalTotal} <ChevronLeft className="w-4 h-4 rotate-180 text-primary-950" />
             </button>
           )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPayment && (
          <PaymentMethodOverlay 
             onClose={() => setShowPayment(false)} 
             onSelect={handlePaymentSelect}
             total={finalTotal}
          />
        )}
      </AnimatePresence>
    </PageTransition>
    </>
  );
}
