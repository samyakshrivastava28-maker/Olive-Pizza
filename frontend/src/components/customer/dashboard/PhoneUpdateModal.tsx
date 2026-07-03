import { useState, useEffect } from 'react';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { PhoneAuthProvider, RecaptchaVerifier, updatePhoneNumber, PhoneAuthCredential } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

interface PhoneUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone: string;
  onSuccess: (newPhone: string) => void;
}

export default function PhoneUpdateModal({ isOpen, onClose, currentPhone, onSuccess }: PhoneUpdateModalProps) {
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');

  // Clean up recaptcha on close
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setNewPhone('');
      setOtp('');
      setLoading(false);
    }
  }, [isOpen]);

  const initRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'phone-update-recaptcha', {
        'size': 'invisible',
      });
    }
  };

  const validateIndianNumber = (phone: string) => {
    // Exact 10 digits starting with 6,7,8,9
    const regex = /^[6-9]\d{9}$/;
    return regex.test(phone.replace('+91', '').trim());
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      let cleanPhone = newPhone.replace(/[\s-]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (!cleanPhone.startsWith('+91')) cleanPhone = '+91' + cleanPhone;

      if (!validateIndianNumber(cleanPhone)) {
        toast.error('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
        setLoading(false);
        return;
      }

      if (cleanPhone === currentPhone || cleanPhone === currentPhone.replace('+91', '')) {
        toast.error('You are already using this phone number.');
        setLoading(false);
        return;
      }

      // Check Duplicates in customer_identities
      const identityRef = doc(db, 'customer_identities', cleanPhone);
      try {
        const identityDoc = await getDoc(identityRef);
        if (identityDoc.exists()) {
          const identityData = identityDoc.data();
          if (identityData.primaryUid !== auth.currentUser.uid) {
            toast.error('This phone number is already registered to another account.');
            setLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (err.code === 'unavailable' || err.message?.includes('offline')) {
          console.warn('Network offline during uniqueness check. Bypassing check to allow OTP.');
        } else {
          throw err;
        }
      }

      initRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const provider = new PhoneAuthProvider(auth);
      
      const vId = await provider.verifyPhoneNumber(cleanPhone, appVerifier);
      setVerificationId(vId);
      setNewPhone(cleanPhone);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (err: any) {
      console.error('OTP Send Error', err);
      toast.error(err.message || 'Failed to send OTP.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      
      // Update Auth Phone Number securely
      await updatePhoneNumber(auth.currentUser, credential);

      // Update Firestore Users Table
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { phone: newPhone });

      // Update Identities Table securely
      const identityRef = doc(db, 'customer_identities', newPhone);
      const identityDoc = await getDoc(identityRef);
      if (!identityDoc.exists()) {
        await setDoc(identityRef, {
          primaryUid: auth.currentUser.uid,
          primaryEmail: auth.currentUser.email || '',
          firstOrderCouponUsed: false,
          totalOrders: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString()
        });
      }

      toast.success('Phone number updated successfully!');
      onSuccess(newPhone);
      onClose();
    } catch (err: any) {
      console.error('OTP Verify Error', err);
      if (err.code === 'auth/invalid-verification-code') {
        toast.error('Invalid OTP. Please try again.');
      } else {
        toast.error(err.message || 'Failed to update phone number.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Smartphone className="w-6 h-6 text-primary-500" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Change Phone Number</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              {step === 'input' ? 'Enter your new 10-digit Indian mobile number.' : `Enter the 6-digit OTP sent to ${newPhone}`}
            </p>

            <div id="phone-update-recaptcha" className="mb-4"></div>

            {step === 'input' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Mobile Number</label>
                  <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-primary-500 transition-colors">
                    <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 flex items-center text-slate-600 dark:text-slate-400 font-bold border-r border-slate-200 dark:border-slate-700">
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent p-3 text-slate-800 dark:text-white outline-none font-bold tracking-wider"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || newPhone.length < 10}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Enter OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-slate-800 dark:text-white outline-none focus:border-primary-500 font-black tracking-[0.5em] text-center text-xl transition-colors"
                    placeholder="••••••"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    disabled={loading}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="flex-[2] bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Verify & Save</>}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
