import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, Search } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useCartStore } from '../lib/store';
import toast from 'react-hot-toast';

export default function ProcessingOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCartStore();
  const { items, address, addressDetails, deliveryType, paymentMethod, finalTotal } = location.state || {};
  
  const [stage, setStage] = useState<'processing' | 'success'>('processing');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/', { replace: true });
      return;
    }

    const placeOrder = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        
        // Ensure backend requirement is met by updating user's address profile before placing order
        if (auth.currentUser && address && deliveryType === 'delivery') {
           const userRef = doc(db, 'users', auth.currentUser.uid);
           await setDoc(userRef, { full_address: address, fullAddress: address, locationSetupCompleted: true }, { merge: true });
        }
        
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            items: items.map((item: any) => ({
              menuItemId: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.variant || 'regular',
              crust: item.crust || 'normal'
            })),
            paymentMethod: paymentMethod,
            deliveryType,
            address: deliveryType === 'delivery' ? address : 'Pickup',
            addressDetails
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to place order');

        setOrderId(data.orderId);
        setStage('success');
        clearCart();
        
        // Auto redirect home to show floating tracking widget
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 4000);

      } catch (err: any) {
        toast.error(err.message);
        navigate('/checkout', { state: location.state, replace: true });
      }
    };

    // Add a slight premium delay for UX
    setTimeout(placeOrder, 1500);

  }, [items, navigate, address, addressDetails, deliveryType, paymentMethod, finalTotal, clearCart]);

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
      {stage === 'processing' ? (
        <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 border-4 border-primary-500/20 rounded-full" />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-2 border-4 border-primary-400 border-t-transparent rounded-full" />
            <Search className="w-8 h-8 text-primary-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Processing Order</h2>
          <p className="text-white/50 text-center">Securely placing your order with Olive Pizza...</p>
        </motion.div>
      ) : (
        <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} transition={{type:'spring', damping:15}} className="flex flex-col items-center bg-dark-900 border border-dark-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden max-w-sm w-full text-center">
          <div className="absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent opacity-50" />
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2, type:'spring'}} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.6)] mb-6 relative z-10">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-white mb-2 relative z-10">Order Placed!</h2>
          <p className="text-white/70 mb-2 relative z-10">Order #{orderId?.slice(-6).toUpperCase()}</p>
          <p className="text-white/70 mb-8 relative z-10 text-sm">The restaurant is reviewing your order.</p>
          
          <div className="w-full bg-dark-950 p-4 rounded-2xl border border-white/5 flex items-center gap-3 relative z-10">
            <Clock className="w-6 h-6 text-primary-400 shrink-0" />
            <div className="text-left">
              <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Estimated Confirmation</p>
              <p className="font-bold text-white">Less than 2 minutes</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
