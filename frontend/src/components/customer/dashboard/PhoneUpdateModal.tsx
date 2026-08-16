import React, { useState, useEffect } from 'react';
import { auth, db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, MessageSquare, Smartphone, ArrowRight, AlertCircle, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { TruecallerService } from '../../../plugins/Truecaller';
import PizzaLoader from '../../../components/ui/PizzaLoader';
import TruecallerQRModal from '../../auth/TruecallerQRModal';

interface PhoneUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone: string;
  onSuccess: (newPhone: string) => void;
}

export default function PhoneUpdateModal({ isOpen, onClose, currentPhone, onSuccess }: PhoneUpdateModalProps) {
  const [step, setStep] = useState<'select_method' | 'otp_input'>('select_method');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isNativeApp, setIsNativeApp] = useState(false);
  
  // Web QR Session State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [webSession, setWebSession] = useState<{ deepLink: string; requestId: string } | null>(null);

  const isDevMode = import.meta.env.VITE_PHONE_AUTH_MODE === 'development' || !import.meta.env.PROD;

  useEffect(() => {
    if (isOpen) {
      setStep('select_method');
      setNewPhone('');
      setOtp('');
      setError('');
      setLoading(false);
      setIsNativeApp(TruecallerService.isNative());
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && step === 'otp_input') {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, step]);

  const normalizePhone = (num: string) => {
    let cleaned = num.replace(/\D/g, '').trim();
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
  };

  const handleTruecallerVerify = async () => {
    const rawDigits = newPhone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const formattedTarget = normalizePhone(newPhone);
    if (formattedTarget === currentPhone) {
      setError("You are already using this phone number.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;

      if (isNativeApp) {
        const isSupported = await TruecallerService.isNativeSupported();
        if (!isSupported) {
          toast('Truecaller is not installed on this device. Switching to SMS OTP verification.', { icon: '⚡' });
          setStep('otp_input');
          await handleSendOtp();
          return;
        }

        const nativeResult = await TruecallerService.verifyNative();
        const verifyRes = await TruecallerService.verifyOnBackend(nativeResult, token, formattedTarget);
        
        if (verifyRes.success) {
          toast.success("Phone verified securely with Truecaller! ✓");
          onSuccess(verifyRes.phone || formattedTarget);
          onClose();
        } else {
          throw new Error(verifyRes.error || "Verification rejected.");
        }
      } else {
        const sessionRes = await TruecallerService.createWebSession(formattedTarget, token);
        const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        setWebSession({ deepLink: sessionRes.deepLink, requestId: sessionRes.requestId });
        setQrModalOpen(true);
        if (isMobileBrowser) {
          window.location.href = sessionRes.deepLink;
        }
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Truecaller verification was cancelled.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQRSuccess = (result: any) => {
    setQrModalOpen(false);
    toast.success("Phone verified securely with Truecaller! ✓");
    onSuccess(result.phone || normalizePhone(newPhone));
    onClose();
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawDigits = newPhone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const formatted = normalizePhone(newPhone);
    if (formatted === currentPhone) {
      setError("You are already using this phone number.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumber: formatted })
      });
      const data = await res.json();

      if (data.success) {
        toast.success("OTP Sent successfully via SMS!");
        setStep('otp_input');
        setCountdown(60);
      } else {
        throw new Error(data.error || "Failed to send OTP.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
      if (isDevMode) setStep('otp_input');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formatted = normalizePhone(newPhone);
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          phoneNumber: formatted, 
          otp: otp.trim(),
          userId: auth.currentUser?.uid
        })
      });
      const data = await res.json();
      
      if (data.success || isDevMode) {
        toast.success("Phone updated successfully! ✓");
        onSuccess(formatted);
        onClose();
      } else {
        throw new Error(data.error || "Invalid OTP code.");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto border border-slate-200 dark:border-slate-800 p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-500">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Update Phone Number</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {/* Input New Phone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    New Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-sm font-bold text-slate-500">+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      className="block w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                      placeholder="9876543210"
                      value={newPhone}
                      onChange={(e) => {
                        setNewPhone(e.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {step === 'select_method' && (
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTruecallerVerify}
                      disabled={loading || newPhone.length < 10}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-[#0052CC]/30 hover:border-[#0052CC] bg-[#0052CC]/5 dark:bg-[#0052CC]/10 transition-all text-left group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0052CC] text-white flex items-center justify-center shadow-md">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            ✓ Verify with Truecaller
                          </span>
                          <p className="text-[11px] text-[#0052CC] dark:text-blue-400 font-medium">
                            Fast & secure 1-tap verification
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#0052CC] group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || newPhone.length < 10}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 bg-white dark:bg-slate-900 transition-all text-left group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Verify with SMS
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            Receive OTP code via SMS
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                )}

                {step === 'otp_input' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter the 6-digit code sent to <br />
                        <strong className="text-slate-900 dark:text-white">+91 {newPhone}</strong>
                      </p>
                    </div>

                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="block w-full text-center tracking-[0.5em] text-2xl py-3 border border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />

                    <button
                      type="submit"
                      disabled={loading || otp.length < 4}
                      className="w-full py-3 px-4 rounded-2xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? <PizzaLoader size="inline" /> : "Verify & Update"}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <button
                        type="button"
                        onClick={() => setStep('select_method')}
                        className="hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        ← Back
                      </button>
                      {countdown > 0 ? (
                        <span>Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="font-bold text-orange-600 hover:text-orange-500"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>

          {/* Web QR Modal */}
          {webSession && (
            <TruecallerQRModal
              isOpen={qrModalOpen}
              onClose={() => setQrModalOpen(false)}
              deepLink={webSession.deepLink}
              requestId={webSession.requestId}
              onSuccess={handleQRSuccess}
              onError={(err) => {
                setQrModalOpen(false);
                setError(err);
                toast.error(err);
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
