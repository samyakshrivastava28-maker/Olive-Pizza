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
  const { items, address, location: orderLocation, addressDetails, deliveryType, paymentMethod, finalTotal, discountAmount } = location.state || {};
  
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
        const currentUser = auth.currentUser;
        const customerPhone = currentUser?.phoneNumber || (currentUser as any)?.phone || '9999999999';
        
        // 1. Sync User Address
        if (currentUser && address && deliveryType === 'delivery') {
           const userRef = doc(db, 'users', currentUser.uid);
           await setDoc(userRef, { 
             full_address: address, 
             fullAddress: address, 
             locationSetupCompleted: true,
             location: orderLocation || null,
             phone: customerPhone,
             phoneSetupCompleted: true
           }, { merge: true }).catch(() => {});
        }

        // 2. Validate Cart & Create Payment Intent
        setStep('validating');
        let verifiedPaymentId = 'pay_cod_' + Date.now();

        try {
          const intentRes = await fetch('/api/payment/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              items: items.map((item: any) => ({
                menuItemId: item.menuItemId || item.id || item._id || 'item-' + Math.random().toString(36).substr(2, 9),
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                size: item.variant || item.size || 'regular',
                crust: item.crust || 'normal',
                image: item.image || ''
              })),
              paymentMethod: paymentMethod || 'cod',
              deliveryAddress: deliveryType === 'delivery' ? address : 'Pickup',
              customerName: currentUser?.displayName || 'Gourmet Customer',
              customerPhone,
              customerEmail: currentUser?.email || '',
            })
          });

          if (intentRes.ok) {
            const intentData = await intentRes.json();
            if (intentData.paymentId) {
              verifiedPaymentId = intentData.paymentId;
            }

            // 3. Online Payment Verification (if not COD)
            if (paymentMethod && paymentMethod !== 'cod' && intentData.providerPaymentId) {
              setStep('applying_discount');
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                  paymentId: intentData.paymentId,
                  providerPaymentId: intentData.providerPaymentId,
                  providerTransactionId: 'tx_' + Date.now()
                })
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.verified) {
                throw new Error(verifyData.error || 'Payment verification failed');
              }
            }
          }
        } catch (intentErr: any) {
          console.warn('[ProcessingOrder] Payment session notice:', intentErr.message);
        }

        // 4. Atomically submit order to backend
        setStep('submitting');
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            items: items.map((item: any) => ({
              menuItemId: item.menuItemId || item.id || item._id || 'item-' + Math.random().toString(36).substr(2, 9),
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.variant || item.size || 'regular',
              crust: item.crust || 'normal',
              image: item.image || '',
              addons: item.addons || []
            })),
            paymentMethod: paymentMethod || 'cod',
            paymentId: verifiedPaymentId,
            deliveryType: deliveryType || 'delivery',
            address: deliveryType === 'delivery' ? address : 'Pickup',
            addressDetails,
            location: orderLocation,
            contactPhone: customerPhone,
            discountAmount: discountAmount || 0
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to place order');

        // 5. Backend confirmed
        setStep('confirmed');
        clearCart();
        
        // Navigate to Order Success Screen
        setTimeout(() => {
          navigate('/order-success/' + data.orderId, { replace: true });
        }, 1200);

      } catch (err: any) {
        console.error('[ProcessingOrder] Order failed:', err);
        setStep('failed');
        setErrorMessage(err.message || 'Order submission could not be completed.');
        isExecutingRef.current = false;
      }
    };

    placeOrder();
  }, [items, navigate, address, addressDetails, deliveryType, paymentMethod, finalTotal, discountAmount, clearCart]);

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
