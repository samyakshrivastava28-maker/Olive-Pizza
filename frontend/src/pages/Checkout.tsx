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
import LocationPicker3D from '../components/map/LocationPicker3D';
import { fetchRoute } from '../services/navigationRouting.service';
import { RESTAURANT_LOCATION, MAX_DELIVERY_RADIUS_KM } from '../lib/config';
import { calculateDistance } from '../lib/utils';
import { useDataStore } from '../lib/dataStore';

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

  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>({
    lat: (user as any)?.lat || RESTAURANT_LOCATION.lat,
    lng: (user as any)?.lng || RESTAURANT_LOCATION.lng
  });

  // Auto-sync customer onboarding location or fetch GPS if address empty
  useEffect(() => {
    if ((user as any)?.lat && (user as any)?.lng) {
      setMapCenter({ lat: (user as any).lat, lng: (user as any).lng });
    }
    if ((user as any)?.fullAddress || (user as any)?.full_address) {
      setAddress((user as any).fullAddress || (user as any).full_address);
    } else if (!address && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.display_name) setAddress(data.display_name);
          } catch (err) {}
        },
        () => {}
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
        const res = await fetch('/api/delivery/availability');
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
      try {
        const route = await fetchRoute(
          { lat: RESTAURANT_LOCATION.lat, lng: RESTAURANT_LOCATION.lng },
          { lat: mapCenter.lat, lng: mapCenter.lng }
        );
        if (route && route.distanceMetres > 0) {
          const maxDistMetres = MAX_DELIVERY_RADIUS_KM * 1000;
          if (route.distanceMetres > maxDistMetres) {
            toast.error(`Delivery unavailable! Distance is ${(route.distanceMetres/1000).toFixed(1)} km (Max ${MAX_DELIVERY_RADIUS_KM} km)`);
            return;
          }
        } else {
          // Haversine geometric fallback if road routing API is temporarily unavailable
          const haversineDistKm = calculateDistance(
            RESTAURANT_LOCATION.lat,
            RESTAURANT_LOCATION.lng,
            mapCenter.lat,
            mapCenter.lng
          );
          if (haversineDistKm > MAX_DELIVERY_RADIUS_KM) {
            toast.error(`Delivery unavailable! Distance is ${haversineDistKm.toFixed(1)} km (Max ${MAX_DELIVERY_RADIUS_KM} km)`);
            return;
          }
        }
      } catch (err) {
        // Haversine geometric fallback
        const haversineDistKm = calculateDistance(
          RESTAURANT_LOCATION.lat,
          RESTAURANT_LOCATION.lng,
          mapCenter.lat,
          mapCenter.lng
        );
        if (haversineDistKm > MAX_DELIVERY_RADIUS_KM) {
          toast.error(`Delivery unavailable! Distance is ${haversineDistKm.toFixed(1)} km (Max ${MAX_DELIVERY_RADIUS_KM} km)`);
          return;
        }
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
        appliedPromo
      }
    });
  };

  // Mock recommended items for cross-selling
  const recommendedItems = [
    { id: 'rec1', name: 'Garlic Breadsticks', price: 149, image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500&q=80' },
    { id: 'rec2', name: 'Choco Lava Cake', price: 129, image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&q=80' },
    { id: 'rec3', name: 'Pepsi 500ml', price: 60, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80' }
  ];

  return (
    <PageTransition className="min-h-screen bg-dark-950 text-white font-sans pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Checkout</h1>
            <p className="text-xs text-white/50">{items.length} items • ₹{finalTotal}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* ── Active Order Warning Banner (1 order at a time policy) ── */}
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-2xl text-amber-400 font-bold text-lg shrink-0">
                ⚠️
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-300">
                  Active Order in Progress {activeOrder.dailyOrderNumber ? `(#${activeOrder.dailyOrderNumber})` : ''}
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5 capitalize">
                  Status: <span className="font-semibold text-white">{activeOrder.status?.replace(/_/g, ' ') || 'Preparing'}</span>. Please wait until delivered to place a new order.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
              className="px-3.5 py-2 bg-amber-500 text-dark-950 text-xs font-black rounded-xl hover:bg-amber-400 transition-transform active:scale-95 shrink-0 flex items-center gap-1.5 shadow-md"
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
            className="bg-red-500/10 border border-red-500/30 rounded-3xl p-4 flex items-start gap-3 text-red-200"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-300">Restaurant Closed</h4>
              <p className="text-xs text-red-200/80 mt-0.5">
                Olive Pizza is currently closed. {storeStatus.openingTime && storeStatus.closingTime ? `Business hours: ${storeStatus.openingTime} - ${storeStatus.closingTime}.` : 'We will open shortly.'}
              </p>
            </div>
          </motion.div>
        ) : deliveryAvailability.availabilityStatus === 'HIGH_DEMAND' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 flex items-start gap-3 text-amber-200"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-300">Delivery Temporarily Unavailable</h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Delivery temporarily unavailable due to high demand. All delivery partners are currently assigned. You can switch to Store Pickup or check back shortly.
              </p>
            </div>
          </motion.div>
        ) : deliveryAvailability.availabilityStatus === 'NO_RIDERS' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-3xl p-4 flex items-start gap-3 text-red-200"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-300">Delivery Unavailable</h4>
              <p className="text-xs text-red-200/80 mt-0.5">
                Delivery unavailable. No delivery partners are currently available. You can opt for Store Pickup.
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* ── Order Mode Selector (Delivery vs Store Pickup) ── */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (!deliveryAvailability.canAcceptDeliveries) {
                toast.error(deliveryAvailability.availabilityMessage || 'Delivery is currently unavailable');
                return;
              }
              setDeliveryType('delivery');
            }}
            className={`flex-1 p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 ${
              !deliveryAvailability.canAcceptDeliveries
                ? 'opacity-50 bg-dark-950 border-white/5 cursor-not-allowed text-slate-500'
                : deliveryType === 'delivery'
                ? 'bg-primary-500/20 border-primary-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-dark-900/50 border-white/5 text-white/60 hover:bg-white/5'
            }`}
          >
            <Bike className="w-5 h-5" />
            <span className="text-xs font-bold">🛵 Home Delivery</span>
            {!deliveryAvailability.canAcceptDeliveries && (
              <span className="text-[10px] text-amber-400 font-bold">
                {deliveryAvailability.availabilityStatus === 'HIGH_DEMAND' ? 'High Demand' : 'Unavailable'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDeliveryType('pickup')}
            className={`flex-1 p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 ${
              deliveryType === 'pickup'
                ? 'bg-primary-500/20 border-primary-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-dark-900/50 border-white/5 text-white/60 hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-bold">🛍️ Store Pickup</span>
            <span className="text-[10px] text-primary-400 font-bold">Ready in 15m • Free</span>
          </button>
        </div>

        {/* ── Customer Information & Address Card (for Delivery) ── */}
        {deliveryType === 'delivery' ? (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary-400" /> Delivery Location
            </h2>
            <div className="bg-dark-900/50 rounded-2xl p-4 border border-white/5 mb-4 relative overflow-hidden h-64 flex flex-col">
              <div className="absolute inset-0 z-0 opacity-80">
                 <LocationPicker3D
                    initialCenter={mapCenter}
                    onChange={({lat, lng, address: reverseAddr}) => {
                      setMapCenter({lat, lng});
                      if (reverseAddr) setAddress(reverseAddr);
                    }}
                    className="w-full h-full"
                 />
              </div>
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-full shrink-0">
                    <Navigation className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="flex-1 bg-dark-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
                    <p className="font-semibold text-white/90 text-sm mb-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-400" /> Current Location
                    </p>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Drag map or enter complete address..."
                      className="w-full bg-transparent text-white/80 text-sm resize-none focus:outline-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 relative z-10 mb-6">
               <button onClick={() => {
                  toast('Drag the map to set your exact location', { icon: '🗺️' });
               }} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">Edit on Map</button>
               <button onClick={() => {
                   if (navigator.geolocation) {
                     const t = toast.loading('Locating...');
                     navigator.geolocation.getCurrentPosition(
                       async (pos) => {
                         const { latitude, longitude } = pos.coords;
                         setMapCenter({lat: latitude, lng: longitude});
                         toast.success('Location found!', { id: t });
                       },
                       () => toast.error('Location access denied', { id: t })
                     );
                  } else {
                    toast.error('Geolocation not supported');
                  }
               }} className="flex-1 py-2.5 rounded-xl bg-primary-600/20 text-primary-400 text-sm font-medium hover:bg-primary-600/30 transition-colors flex items-center justify-center gap-2">
                 <Navigation className="w-4 h-4" /> Use My GPS
               </button>
            </div>

            <div className="space-y-4 relative z-10 border-t border-white/5 pt-6 mt-2">
              <h3 className="text-sm font-semibold text-white/80">Additional Delivery Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="House No." 
                  value={houseNumber}
                  onChange={e => setHouseNumber(e.target.value)}
                  className="bg-dark-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
                <input 
                  type="text" 
                  placeholder="Apartment / Floor" 
                  value={apartment}
                  onChange={e => setApartment(e.target.value)}
                  className="bg-dark-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              <input 
                type="text" 
                placeholder="Landmark / Neighbourhood" 
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className="w-full bg-dark-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
              <textarea 
                placeholder="Delivery Instructions (e.g., Leave at door)" 
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                className="w-full bg-dark-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors resize-none"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 relative overflow-hidden">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-primary-400" /> Store Pickup Location
            </h2>
            <div className="bg-dark-900/50 rounded-2xl p-4 border border-white/5 space-y-2">
              <p className="font-bold text-white text-sm">Olive Pizza Gourmet Kitchen</p>
              <p className="text-xs text-white/70">Main Road, Rajnandgaon, Chhattisgarh 491441</p>
              <div className="flex items-center gap-2 text-xs text-primary-400 pt-2 border-t border-white/5">
                <Clock className="w-4 h-4" />
                <span>Estimated preparation time: 15-20 minutes</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Coupons Section */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-orange-400" /> Offers & Benefits
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Promo Code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 text-sm uppercase text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
            <button
              onClick={handleApplyPromo}
              className="bg-white/10 hover:bg-white/15 text-white px-5 rounded-xl font-bold text-sm transition-all active:scale-95"
            >
              Apply
            </button>
          </div>
          <AnimatePresence>
            {appliedPromo && (
              <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex justify-between items-center overflow-hidden">
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-green-400" />
                   <span className="text-sm text-green-400 font-medium">'{appliedPromo.code}' applied!</span>
                </div>
                <button onClick={() => setAppliedPromo(null)} className="text-xs text-white/50 hover:text-white">Remove</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Order Summary */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-blue-400" /> Order Summary
          </h2>
          <div className="space-y-3">
             {items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs font-bold text-primary-400">{item.quantity}x</span>
                      <span className="text-white/80">{item.name}</span>
                   </div>
                   <span className="font-semibold text-white/90">₹{item.price * item.quantity}</span>
                </div>
             ))}
          </div>
          <div className="w-full h-px bg-white/5 my-4" />
          <div className="space-y-2 text-sm text-white/60">
             <div className="flex justify-between"><span>Item Total</span><span>₹{total}</span></div>
             {appliedPromo && <div className="flex justify-between text-green-400"><span>Discount</span><span>-₹{discountAmount}</span></div>}
             <div className="flex justify-between"><span>Taxes</span><span>₹{taxes}</span></div>
             <div className="flex justify-between"><span>Delivery Fee</span><span>₹{deliveryFee}</span></div>
          </div>
          <div className="w-full h-px bg-white/10 my-4" />
          <div className="flex justify-between items-center">
             <span className="font-bold text-lg text-white">Grand Total</span>
             <motion.span key={finalTotal} initial={{scale:1.2, color:'#4ade80'}} animate={{scale:1, color:'#ffffff'}} className="font-black text-xl text-white">₹{finalTotal}</motion.span>
          </div>
        </motion.div>

        {/* Recommended Items (Cross-sell) */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.25}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent opacity-50" />
           <h2 className="text-lg font-bold flex items-center gap-2 mb-4 relative z-10">
             <Star className="w-5 h-5 text-yellow-400" /> Customers also ordered
           </h2>
           <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar relative z-10 -mx-5 px-5">
             {recommendedItems.map((rec) => (
               <div key={rec.id} className="min-w-[140px] bg-dark-900/80 rounded-2xl border border-white/5 overflow-hidden snap-start shrink-0 flex flex-col">
                 <div className="h-24 w-full relative">
                   <img src={rec.image} alt={rec.name} className="w-full h-full object-cover" />
                 </div>
                 <div className="p-3 flex flex-col justify-between flex-1">
                   <p className="text-xs font-bold text-white/90 mb-2 line-clamp-2">{rec.name}</p>
                   <div className="flex items-center justify-between mt-auto">
                     <span className="text-sm font-black text-white">₹{rec.price}</span>
                     <button 
                       onClick={() => {
                         useCartStore.getState().addItem({ id: rec.id, menuItemId: rec.id, name: rec.name, price: rec.price, image: rec.image, quantity: 1 });
                         toast.success(`Added ${rec.name}`);
                       }}
                       className="bg-primary-500/20 text-primary-400 w-6 h-6 rounded-md flex items-center justify-center font-bold pb-0.5 hover:bg-primary-500 hover:text-white transition-colors"
                     >
                       +
                     </button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </motion.div>

        {/* Payment Method Section */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
           <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
             <CreditCard className="w-5 h-5 text-purple-400" /> Payment Method
           </h2>
           {selectedPayment ? (
             <div className="flex justify-between items-center bg-dark-900/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-xl">
                    <CreditCard className="w-5 h-5 text-primary-400" />
                  </div>
                  <span className="font-semibold text-white/90 uppercase">{selectedPayment === 'card' ? 'Credit / Debit Card' : selectedPayment === 'upi' ? 'UPI' : selectedPayment === 'wallet' ? 'Wallets' : 'Cash on Delivery'}</span>
                </div>
                <button onClick={() => setShowPayment(true)} className="text-primary-400 text-sm font-medium hover:text-primary-300">Change</button>
             </div>
           ) : (
             <button onClick={() => setShowPayment(true)} className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium">
                <CreditCard className="w-5 h-5" /> Add Payment Method
             </button>
           )}
        </motion.div>

      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-dark-950/80 backdrop-blur-2xl border-t border-white/10 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-xl mx-auto flex gap-3">
           <button 
             onClick={() => navigate('/cart')}
             className="flex-1 bg-white/5 text-white/70 font-bold rounded-2xl hover:bg-white/10 transition-colors py-4 flex items-center justify-center"
           >
             Cancel
           </button>
           {activeOrder ? (
             <button 
               onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
               className="flex-[2] bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 py-4 text-sm"
             >
               <Navigation className="w-4 h-4" /> Track Active Order
             </button>
           ) : !deliveryAvailability.isRestaurantOpen && !storeStatus.isRestaurantOpen ? (
             <button 
               disabled
               className="flex-[2] bg-red-950/60 border border-red-500/30 text-red-400 font-bold rounded-2xl cursor-not-allowed opacity-60 flex items-center justify-center gap-2 py-4 text-sm"
             >
               <AlertCircle className="w-4 h-4" /> Restaurant Closed
             </button>
           ) : deliveryType === 'delivery' && !deliveryAvailability.canAcceptDeliveries ? (
             <button 
               onClick={() => setDeliveryType('pickup')}
               className="flex-[2] bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 py-4 text-sm"
             >
               <ShoppingBag className="w-4 h-4" /> Switch to Store Pickup
             </button>
           ) : (
             <button 
               onClick={handlePlaceOrder}
               className="flex-[2] bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(85,119,90,0.3)] hover:shadow-[0_0_30px_rgba(85,119,90,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale py-4"
             >
               Place Order • ₹{finalTotal} <ChevronLeft className="w-5 h-5 rotate-180" />
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
  );
}
