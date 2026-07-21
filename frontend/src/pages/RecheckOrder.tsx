import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, Receipt, AlertCircle, Play, Pause, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import PageTransition from '../components/PageTransition';
import { useAuthStore } from '../lib/store';
import toast from 'react-hot-toast';

export default function RecheckOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, addressDetails, deliveryType, items, paymentMethod, finalTotal, discountAmount, deliveryFee, taxes, total, appliedPromo } = location.state || {};
  
  const [isPaused, setIsPaused] = useState(false);
  const [validating, setValidating] = useState(true);

  // If missing state, send back
  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/checkout', { replace: true });
    } else {
      // Simulate validation animation
      setTimeout(() => setValidating(false), 2500);
    }
  }, [items, navigate]);

  const handleConfirm = () => {
    if (validating || isPaused) return;
    navigate('/processing-order', {
      state: location.state,
      replace: true
    });
  };

  return (
    <PageTransition className="min-h-screen bg-dark-950 text-white font-sans pb-32 pt-6 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header & Validation State */}
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
             <ChevronLeft className="w-5 h-5" />
           </button>
           <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Review Order</h1>
           <div className="w-9" />
        </div>

        {validating ? (
          <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-primary-500/10 border border-primary-500/20 rounded-3xl p-6 text-center flex flex-col items-center justify-center space-y-4">
             <div className="relative w-16 h-16">
               <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                 className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent" 
               />
               <ShieldCheck className="w-6 h-6 text-primary-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-primary-400">Validating Order...</h3>
               <p className="text-sm text-white/50">Checking items, address, and coupons.</p>
             </div>
          </motion.div>
        ) : (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6 text-center shadow-[0_0_40px_rgba(34,197,94,0.1)]">
             <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
               <ShieldCheck className="w-6 h-6 text-green-400" />
             </div>
             <h3 className="text-lg font-bold text-green-400">Ready to Place</h3>
             <p className="text-sm text-white/50">Everything looks good. Review and confirm.</p>
          </motion.div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-3 text-white/50 relative z-10">
              <MapPin className="w-4 h-4 text-primary-400" /> <span className="text-xs font-bold uppercase tracking-wider">Delivery</span>
            </div>
            <p className="text-sm font-medium text-white/90 line-clamp-3 leading-snug relative z-10">
              {deliveryType === 'delivery' ? (
                <>
                  {addressDetails?.houseNumber && `${addressDetails.houseNumber}, `}
                  {addressDetails?.apartment && `${addressDetails.apartment}, `}
                  {address}
                </>
              ) : 'Pickup at Store'}
            </p>
          </motion.div>
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-3 text-white/50 relative z-10">
              <CreditCard className="w-4 h-4 text-purple-400" /> <span className="text-xs font-bold uppercase tracking-wider">Payment</span>
            </div>
            <p className="text-sm font-medium text-white/90 uppercase relative z-10">
              {paymentMethod === 'card' ? 'Card' : paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'wallet' ? 'Wallet' : 'Cash on Delivery'}
            </p>
            <p className="text-xs text-white/40 mt-1 relative z-10">₹{finalTotal}</p>
          </motion.div>
        </div>

        {/* Summary List */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 relative overflow-hidden">
           <div className="flex items-center gap-2 mb-4 text-white/50 relative z-10">
              <Receipt className="w-4 h-4 text-blue-400" /> <span className="text-xs font-bold uppercase tracking-wider">Order Summary</span>
           </div>
           <div className="space-y-3 mb-4 relative z-10">
             {items?.slice(0,2).map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                   <span className="text-white/80">{item.quantity}x {item.name}</span>
                   <span className="font-medium text-white/90">₹{item.price * item.quantity}</span>
                </div>
             ))}
             {items?.length > 2 && (
               <p className="text-xs text-white/40 italic">+{items.length - 2} more items</p>
             )}
           </div>
           
           <div className="h-px bg-white/5 w-full my-4 relative z-10" />
           <div className="space-y-2 text-xs text-white/60 mb-4 relative z-10">
              <div className="flex justify-between"><span>Item Total</span><span>₹{total}</span></div>
              {appliedPromo && <div className="flex justify-between text-green-400"><span>Discount ({appliedPromo.code})</span><span>-₹{discountAmount}</span></div>}
              <div className="flex justify-between"><span>Taxes</span><span>₹{taxes}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>₹{deliveryFee}</span></div>
           </div>
           <div className="flex justify-between items-center bg-dark-900/50 p-3 rounded-2xl border border-white/5 relative z-10">
             <span className="font-bold text-white">Grand Total</span>
             <span className="font-black text-xl text-primary-400">₹{finalTotal}</span>
           </div>
        </motion.div>

      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-dark-950/80 backdrop-blur-2xl border-t border-white/10 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-xl mx-auto flex gap-3">
           <button 
             onClick={() => setIsPaused(!isPaused)}
             className={`p-4 rounded-2xl transition-colors flex items-center justify-center flex-shrink-0 w-[72px] ${isPaused ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
           >
             {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
           </button>
           <button 
             disabled={validating || isPaused}
             onClick={handleConfirm}
             className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(85,119,90,0.3)] hover:shadow-[0_0_30px_rgba(85,119,90,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale py-4 overflow-hidden relative group"
           >
             <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
             <span className="relative z-10 flex items-center gap-2">
               {validating ? 'Validating...' : isPaused ? 'Paused' : 'Confirm Order'} <ArrowRight className="w-5 h-5" />
             </span>
           </button>
        </div>
        {!validating && !isPaused && (
           <p className="text-center text-[10px] text-white/30 mt-3 font-medium uppercase tracking-wider">
             By confirming, you agree to our terms of service
           </p>
        )}
      </div>
    </PageTransition>
  );
}
