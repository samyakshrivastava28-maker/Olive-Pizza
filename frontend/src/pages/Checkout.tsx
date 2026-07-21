import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, CreditCard, ChevronLeft, Ticket, Navigation, Star, TrendingUp, CheckCircle, ShieldCheck, Receipt } from 'lucide-react';
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
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapController({ center, setCenter, setAddress }: any) {
  const map = useMapEvents({
    dragend: async () => {
      const c = map.getCenter();
      setCenter([c.lat, c.lng]);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.lat}&lon=${c.lng}`);
        const data = await res.json();
        if (data && data.display_name) setAddress(data.display_name);
      } catch (err) {}
    }
  });
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
}

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
  
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [standaloneCoupons, setStandaloneCoupons] = useState<any[]>([]);
  
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('');
  
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('idle'); // idle, processing, success
  const [orderId, setOrderId] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.0760, 72.8777]);

  // Auto-fetch location if empty
  useEffect(() => {
    if (!address && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.display_name) setAddress(data.display_name);
          } catch (err) {}
        },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login?redirect=/checkout');
    if (items.length === 0) navigate('/cart');
    
    // Fetch Promos
    const fetchPromos = async () => {
      try {
        const eventsSnap = await getDocs(query(collection(db, 'events'), where('isActive', '==', true)));
        const now = Date.now();
        setActiveEvents(
          eventsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((e: any) => e.startDate <= now && e.endDate >= now)
        );
        const couponsSnap = await getDocs(query(collection(db, 'coupons'), where('isActive', '==', true)));
        setStandaloneCoupons(couponsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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
    if (!address.trim() && deliveryType === 'delivery') {
      toast.error('Please enter a delivery address');
      return;
    }
    if (!selectedPayment) {
      toast.error('Please select a payment method');
      setShowPayment(true);
      return;
    }
    
    setShowProcessing(true);
    setProcessingStatus('processing');

    try {
      const token = await auth.currentUser?.getIdToken();
      
      // Simulate premium delay
      await new Promise(r => setTimeout(r, 6000));
      
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          items: items.map(item => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size: item.variant || 'regular',
            crust: item.crust || 'normal'
          })),
          paymentMethod: selectedPayment,
          deliveryType,
          address: deliveryType === 'delivery' ? address : 'Pickup',
          addressDetails: {
            houseNumber,
            apartment,
            landmark,
            instructions
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setOrderId(data.orderId);
      setProcessingStatus('success');
      
      // clear cart later after success screen
      setTimeout(() => {
        clearCart();
        navigate(`/order-success/${data.orderId}`);
      }, 3000);
      
    } catch (err: any) {
      toast.error(err.message);
      setShowProcessing(false);
      setProcessingStatus('idle');
    }
  };

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
        {/* Customer Information & Address Card */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-400" /> Delivery Location
          </h2>
          <div className="bg-dark-900/50 rounded-2xl p-4 border border-white/5 mb-4 relative overflow-hidden h-64 flex flex-col">
            <div className="absolute inset-0 z-0 opacity-80">
               <MapContainer center={mapCenter} zoom={16} className="w-full h-full" zoomControl={false} attributionControl={false}>
                 <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                 <MapController center={mapCenter} setCenter={setMapCenter} setAddress={setAddress} />
               </MapContainer>
               {/* Center Pin Overlay */}
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none drop-shadow-2xl">
                 <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center border-4 border-white/20 shadow-[0_0_20px_rgba(249,115,22,0.6)]">
                   <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                 </div>
               </div>
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
                       setMapCenter([latitude, longitude]);
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
           <button 
             onClick={handlePlaceOrder}
             className="flex-[2] bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(85,119,90,0.3)] hover:shadow-[0_0_30px_rgba(85,119,90,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale py-4"
           >
             Place Order • ₹{finalTotal} <ChevronLeft className="w-5 h-5 rotate-180" />
           </button>
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
        {showProcessing && (
           <ProcessingOverlay status={processingStatus} />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
