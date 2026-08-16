import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useCartStore } from '../lib/store';
import toast from 'react-hot-toast';
import ProcessingOverlay, { CheckoutStep } from '../components/checkout/ProcessingOverlay';

export default function ProcessingOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCartStore();
  const { items, address, location: orderLocation, addressDetails, deliveryType, paymentMethod, finalTotal } = location.state || {};
  
  const [step, setStep] = useState<CheckoutStep>('preparing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isExecutingRef = useRef(false);

  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/', { replace: true });
      return;
    }

    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    const placeOrder = async () => {
      try {
        setStep('preparing');
        const token = await auth.currentUser?.getIdToken();
        
        // 1. Sync User Address
        if (auth.currentUser && address && deliveryType === 'delivery') {
           const userRef = doc(db, 'users', auth.currentUser.uid);
           await setDoc(userRef, { 
             full_address: address, 
             fullAddress: address, 
             locationSetupCompleted: true,
             location: orderLocation || null
           }, { merge: true }).catch(() => {});
        }

        // 2. Validate Cart & Create Payment Intent
        setStep('validating');
        const intentRes = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            items: items.map((item: any) => ({
              menuItemId: item.menuItemId || item.id || item._id || 'item-' + Math.random().toString(36).substr(2, 9),
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.variant || 'regular',
              crust: item.crust || 'normal'
            })),
            paymentMethod: paymentMethod || 'cod',
            deliveryAddress: deliveryType === 'delivery' ? address : 'Pickup',
            customerName: auth.currentUser?.displayName || 'Gourmet Customer',
            customerPhone: auth.currentUser?.phoneNumber || '',
            customerEmail: auth.currentUser?.email || '',
          })
        });

        const intentData = await intentRes.json();
        if (!intentRes.ok) throw new Error(intentData.error || 'Failed to create payment session');

        let verifiedPaymentId = intentData.paymentId;

        // 3. Apply and verify discounts / payments
        setStep('applying_discount');
        if (paymentMethod !== 'cod' && intentData.providerPaymentId) {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              paymentId: intentData.paymentId,
              providerPaymentId: intentData.providerPaymentId,
              providerTransactionId: `tx_${Date.now()}`
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.verified) {
            throw new Error(verifyData.error || 'Payment verification failed');
          }
        }

        // 4. Atomically submit order to backend
        setStep('submitting');
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            items: items.map((item: any) => ({
              menuItemId: item.menuItemId || item.id || item._id || 'item-' + Math.random().toString(36).substr(2, 9),
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.variant || 'regular',
              crust: item.crust || 'normal'
            })),
            paymentMethod: paymentMethod,
            paymentId: verifiedPaymentId,
            deliveryType,
            address: deliveryType === 'delivery' ? address : 'Pickup',
            addressDetails,
            location: orderLocation
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to place order');

        // 5. Backend confirmed
        setStep('confirmed');
        clearCart();
        
        // Navigate to Order Success Screen
        setTimeout(() => {
          navigate(`/order-success/${data.orderId}`, { replace: true });
        }, 1200);

      } catch (err: any) {
        console.error('[ProcessingOrder] Order failed:', err);
        setStep('failed');
        setErrorMessage(err.message || 'Order submission could not be completed.');
        isExecutingRef.current = false;
      }
    };

    placeOrder();
  }, [items, navigate, address, addressDetails, deliveryType, paymentMethod, finalTotal, clearCart]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
      <ProcessingOverlay
        status={step}
        errorMessage={errorMessage}
        onRetry={() => {
          isExecutingRef.current = false;
          setStep('preparing');
          window.location.reload();
        }}
        onClose={() => {
          navigate('/checkout', { state: location.state, replace: true });
        }}
      />
    </div>
  );
}
