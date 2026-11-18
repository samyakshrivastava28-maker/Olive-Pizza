import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useCartStore, useAuthStore } from '../lib/store';
import { OrderingContextService } from '../lib/orderingContext';
import { fetchApi } from '../lib/config';
import toast from 'react-hot-toast';
import ProcessingOverlay, { CheckoutStep } from '../components/checkout/ProcessingOverlay';

export default function ProcessingOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, franchiseId: cartFranchiseId } = useCartStore();
  const { items, address, location: orderLocation, addressDetails, deliveryType, paymentMethod, finalTotal, discountAmount, couponCode, appliedPromo } = location.state || {};
  
  const [step, setStep] = useState<CheckoutStep>('preparing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isExecutingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(
    `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );

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

        let currentUser = auth.currentUser;
        if (!currentUser && typeof (auth as any).authStateReady === 'function') {
          try {
            await (auth as any).authStateReady();
            currentUser = auth.currentUser;
          } catch {}
        }

        if (!currentUser) {
          throw new Error('Please sign in to complete your order.');
        }

        const token = await currentUser.getIdToken();
        const storeUser = useAuthStore.getState().user;
        let customerPhone = currentUser?.phoneNumber || storeUser?.phone || (currentUser as any)?.phone;

        if ((!customerPhone || customerPhone === '9999999999') && currentUser?.uid) {
          try {
            const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              if (uData?.phone) customerPhone = uData.phone;
            }
          } catch {}
        }
        
        if (!customerPhone || customerPhone === '9999999999' || customerPhone.replace(/\D/g, '').length < 10) {
          throw new Error('A verified mobile number is required to place an order. Please complete your phone profile.');
        }

        // 1. Sync User Address to Profile
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
        if (!paymentMethod) {
          throw new Error('Please select a payment method to complete your order.');
        }
        const isCod = paymentMethod.toLowerCase() === 'cod';
        let verifiedPaymentId: string | null = isCod ? 'COD' : null;

        // Resolve authoritative coordinates
        let effectiveCoords = orderLocation && !isNaN(orderLocation.lat) && !isNaN(orderLocation.lng) ? orderLocation : null;
        if (!effectiveCoords) {
          try {
            const stored = localStorage.getItem('op_active_location');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.lat && parsed?.lng && !isNaN(Number(parsed.lat)) && !isNaN(Number(parsed.lng))) {
                effectiveCoords = { lat: Number(parsed.lat), lng: Number(parsed.lng) };
              }
            }
          } catch {}
        }

        if (deliveryType === 'delivery' && (!effectiveCoords || isNaN(effectiveCoords.lat) || isNaN(effectiveCoords.lng))) {
          throw new Error('Your delivery GPS coordinates could not be detected. Please return to Checkout and confirm your location on the map.');
        }

        if (!isCod) {
          const intentRes = await fetchApi('/api/payment/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              items: items.map((item: any) => ({
                menuItemId: item.menuItemId || item.id || item._id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                size: item.variant || item.size || 'regular',
                crust: item.crust || 'normal',
                image: item.image || ''
              })),
              paymentMethod,
              deliveryAddress: deliveryType === 'delivery' ? address : 'Pickup',
              customerName: currentUser?.displayName || 'Gourmet Customer',
              customerPhone,
              customerEmail: currentUser?.email || '',
            })
          });

          const intentData = typeof (intentRes as any)?.json === 'function' ? await (intentRes as any).json().catch(() => null) : intentRes;
          if (!intentRes?.ok || !intentData?.paymentId) {
            throw new Error(intentData?.error || 'Failed to initiate secure payment gateway session.');
          }
          verifiedPaymentId = intentData.paymentId;

          // 3. Online Payment Verification
          if (intentData.providerPaymentId) {
            setStep('applying_discount');
            const verifyRes = await fetchApi('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({
                paymentId: intentData.paymentId,
                providerPaymentId: intentData.providerPaymentId
              })
            });

            const verifyData = typeof (verifyRes as any)?.json === 'function' ? await (verifyRes as any).json().catch(() => null) : verifyRes;
            if (!verifyRes?.ok || !verifyData?.verified) {
              throw new Error(verifyData?.error || 'Online payment could not be verified. Your card was not charged.');
            }
          }
        }

        // 4. Atomically submit order to backend
        setStep('submitting');
        const res = await fetchApi('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'Idempotency-Key': idempotencyKeyRef.current
          },
          body: JSON.stringify({
            items: items.map((item: any) => ({
              menuItemId: item.menuItemId || item.id || item._id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.variant || item.size || 'regular',
              crust: item.crust || 'normal',
              image: item.image || '',
              addons: item.addons || []
            })),
            paymentMethod: paymentMethod,
            paymentId: verifiedPaymentId,
            deliveryType: deliveryType || 'delivery',
            address: deliveryType === 'delivery' ? address : 'Pickup',
            addressDetails,
            location: effectiveCoords || undefined,
            lat: effectiveCoords?.lat,
            lng: effectiveCoords?.lng,
            contactPhone: customerPhone,
            orderSource: 'ONLINE',
            franchiseId: OrderingContextService.getCachedContext()?.franchiseId || cartFranchiseId || undefined,
            branchId: OrderingContextService.getCachedContext()?.branchId || undefined,
            // Send couponCode so server can independently verify and compute discount.
            // Client-side discountAmount is intentionally NOT sent � server recalculates it.
            couponCode: couponCode || (appliedPromo?.code || null)
          })
        });

        const data = typeof (res as any)?.json === 'function' ? await (res as any).json().catch(() => null) : res;
        if (!res?.ok || !data?.orderId) {
          const errMsg = data?.error || (data?.code === 'OUT_OF_DELIVERY_ZONE' ? "We currently don't deliver to this location. Please choose a nearby serviceable area or select store pickup." : 'Failed to place order on server');
          throw new Error(errMsg);
        }

        // 5. Backend confirmed successfully
        setStep('confirmed');
        clearCart();
        
        // Surface coupon reject reason if server could not validate the coupon
        if (data.couponRejectReason) {
          toast(`Coupon not applied: ${data.couponRejectReason}`, { icon: "\uD83C\uDFF7\uFE0F" });
        } else if (data.appliedCouponCode && data.discountAmount > 0) {
          toast.success(`Coupon ${data.appliedCouponCode} applied! You saved \u20B9${data.discountAmount}`, { duration: 4000 });
        }

        // Navigate to Order Success Screen
        setTimeout(() => {
          navigate('/order-success/' + data.orderId, { replace: true });
        }, 1200);

      } catch (err: any) {
        console.error('[ProcessingOrder] Order failed:', err);
        setStep('failed');

        let customerMsg = err.message || 'Order submission could not be completed.';

        // Humanize and translate technical issues into actionable customer-friendly explanations
        if (customerMsg.includes('Invalid size') || customerMsg.includes('size requested')) {
          customerMsg = "Please re-select your pizza size or crust in the cart. The menu variant has been refreshed.";
        } else if (customerMsg.includes('OUT_OF_DELIVERY_ZONE') || customerMsg.includes('delivery radius') || customerMsg.includes("don't deliver")) {
          customerMsg = "Your delivery location is outside our standard delivery zone. You can still choose Takeaway or Store Pickup!";
        } else if (customerMsg.includes('STORE_CLOSED') || customerMsg.includes('closed')) {
          customerMsg = "Our kitchen is currently closed (Opens daily at 12:00 PM). Please check back during operational hours.";
        } else if (customerMsg.includes('RESOURCE_EXHAUSTED') || customerMsg.includes('Failed to fetch') || customerMsg.includes('NetworkError')) {
          customerMsg = "Could not reach the kitchen terminal due to a momentary network hiccup. Please tap Retry to securely confirm your order.";
        } else if (customerMsg.includes('verified mobile number') || customerMsg.includes('phone profile')) {
          customerMsg = "A valid 10-digit phone number is required so our rider can deliver smoothly. Please update your profile in Checkout.";
        }

        setErrorMessage(customerMsg);
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
