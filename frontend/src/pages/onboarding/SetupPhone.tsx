import React, { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { ShieldCheck, MessageSquare, Smartphone, CheckCircle, ArrowRight, Edit2, AlertCircle } from "lucide-react";
import PizzaLoader from "../../components/ui/PizzaLoader";
import toast from "react-hot-toast";
import { useAuthStore } from "../../lib/store";
import { TruecallerService } from "../../plugins/Truecaller";
import TruecallerQRModal from "../../components/auth/TruecallerQRModal";
import { fetchApi } from "../../lib/config";

export default function SetupPhone() {
  const { setUser, user, role } = useAuthStore();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const redirectParam = searchParams.get('redirect');
  const redirectPath = redirectParam || (user?.locationSetupCompleted ? "/" : "/onboarding/location");

  // Initial phone state from user profile or empty
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+91/, '') || "");
  const [editingPhone, setEditingPhone] = useState(!user?.phone);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<'select_method' | 'otp_input'>('select_method');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isNativeApp, setIsNativeApp] = useState(false);

  // Web QR Session State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [webSession, setWebSession] = useState<{ deepLink: string; requestId: string } | null>(null);

  const isDevMode = import.meta.env.VITE_PHONE_AUTH_MODE === 'development' || !import.meta.env.PROD;

  // 1. If user is already phone-verified, skip verification immediately
  useEffect(() => {
    if (user?.phoneVerified && user?.phoneSetupCompleted) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, redirectPath, navigate]);

  // 2. Check platform capabilities
  useEffect(() => {
    setIsNativeApp(TruecallerService.isNative());
  }, []);

  // 3. Countdown timer for OTP resend
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

  const syncUserSession = async (verifiedPhone: string, method: string) => {
    const formattedPhone = normalizePhone(verifiedPhone);
    const uid = auth.currentUser?.uid || user?.uid;

    if (uid) {
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(
          userRef,
          {
            phone: formattedPhone,
            phoneVerified: true,
            verificationMethod: method,
            verifiedAt: Date.now(),
            phoneSetupCompleted: true
          },
          { merge: true }
        );

        const identityRef = doc(db, 'customer_identities', formattedPhone);
        await setDoc(
          identityRef,
          {
            primaryUid: uid,
            verifiedAt: Date.now()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('[SetupPhone] Sync user warning:', err);
      }
    }

    if (user) {
      setUser(
        {
          ...user,
          phone: formattedPhone,
          phoneVerified: true,
          phoneSetupCompleted: true,
          onboardingComplete: user.locationSetupCompleted ?? false
        },
        role || 'customer'
      );
    }
  };

  // 4. Handle Truecaller 1-Tap or Web/QR Verification
  const handleTruecallerVerification = async () => {
    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number before verifying.");
      setEditingPhone(true);
      return;
    }

    setLoading(true);
    setError("");

    const targetFormatted = normalizePhone(phone);

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;

      if (isNativeApp) {
        // Android Native Capacitor Flow
        const isSupported = await TruecallerService.isNativeSupported();
        if (!isSupported) {
          toast('Truecaller is not installed on this device. Switching to SMS OTP verification.', { icon: '⚡' });
          setStep('otp_input');
          await handleSendOtp();
          return;
        }

        // Native 1-Tap Consent BottomSheet
        const nativeResult = await TruecallerService.verifyNative();
        
        // Validate payload on backend against Truecaller RSA public keys
        const verifyRes = await TruecallerService.verifyOnBackend(nativeResult, token, targetFormatted);
        
        if (verifyRes.success) {
          toast.success("Phone verified securely with Truecaller! ✓");
          await syncUserSession(verifyRes.phone || targetFormatted, 'truecaller');
          navigate(redirectPath, { replace: true });
        } else {
          throw new Error(verifyRes.error || "Truecaller verification rejected by server.");
        }
      } else {
        // Website Flow (Mobile Web / Desktop QR)
        const sessionRes = await TruecallerService.createWebSession(targetFormatted, token);
        
        // If on mobile browser with deep link support
        const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isMobileBrowser) {
          // Open deep link for mobile browser
          setWebSession({ deepLink: sessionRes.deepLink, requestId: sessionRes.requestId });
          setQrModalOpen(true);
          // Try invoking deep link
          window.location.href = sessionRes.deepLink;
        } else {
          // Open Desktop QR Modal with live status polling
          setWebSession({ deepLink: sessionRes.deepLink, requestId: sessionRes.requestId });
          setQrModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error('[SetupPhone] Truecaller error:', err);
      const msg = err.message || "Truecaller verification was cancelled or unavailable.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQRSuccess = async (result: any) => {
    setQrModalOpen(false);
    toast.success("Phone verified securely with Truecaller! ✓");
    const targetFormatted = normalizePhone(phone);
    await syncUserSession(result.phone || targetFormatted, 'truecaller');
    navigate(redirectPath, { replace: true });
  };

  const handleQRError = (errMsg: string) => {
    setQrModalOpen(false);
    setError(errMsg);
    toast.error(errMsg);
  };

  // 5. Handle SMS OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setEditingPhone(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formatted = normalizePhone(phone);
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetchApi('/api/phone/send-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumber: formatted })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "OTP sent successfully via SMS!");
        setStep('otp_input');
        setCountdown(60);
      } else {
        throw new Error(data.error || "Failed to send OTP.");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg: string = err.message || "Failed to send OTP.";
      // When Fast2SMS is blocked (website verification), guide user to Truecaller
      if (errMsg.includes('website verification') || errMsg.includes('Truecaller')) {
        setError("SMS is temporarily unavailable. Please use Truecaller verification above to verify your phone instantly.");
        toast.error("SMS unavailable — please use Truecaller verification");
      } else {
        toast.error(errMsg);
        setError(errMsg);
      }
      if (isDevMode) setStep('otp_input');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter the verification code sent to your phone.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formatted = normalizePhone(phone);
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetchApi('/api/phone/verify-otp', {
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
        toast.success("Phone verified successfully! ✓");
        await syncUserSession(formatted, 'sms_otp');
        navigate(redirectPath, { replace: true });
      } else {
        throw new Error(data.error || "Invalid OTP code.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  // Demo Bypass (Developer only in non-production)
  const handleDemoBypass = async () => {
    if (!isDevMode) return;
    setLoading(true);
    try {
      const formatted = normalizePhone(phone || '9999999999');
      await syncUserSession(formatted, 'demo_bypass');
      toast.success("⚡ Demo bypass verified!");
      navigate(redirectPath, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center shadow-md">
            <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          PHONE VERIFICATION
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Verify your mobile number to secure your Olive Pizza orders
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-5 sm:px-8 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800">
          
          {/* Phone Number Display / Edit Card */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your number
              </span>
              {!editingPhone && (
                <button
                  type="button"
                  onClick={() => setEditingPhone(true)}
                  className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              )}
            </div>

            {editingPhone ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    setError("");
                  }}
                  className="flex-1 px-3 py-2 text-base font-bold tracking-wide rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (phone.length === 10) setEditingPhone(false);
                    else setError("Enter a valid 10-digit number.");
                  }}
                  className="px-3 py-2 text-xs font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors"
                >
                  Set
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-wide">
                  +91 {phone.slice(0, 5)} {phone.slice(5)}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Choose Verification Method */}
          {step === 'select_method' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Choose verification method:
              </p>

              {/* Truecaller 1-Tap Option */}
              <button
                type="button"
                onClick={handleTruecallerVerification}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#0052CC]/30 hover:border-[#0052CC] bg-[#0052CC]/5 dark:bg-[#0052CC]/10 hover:bg-[#0052CC]/10 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0052CC] text-white flex items-center justify-center shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#0052CC] font-bold">✓</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Verify with Truecaller
                      </span>
                    </div>
                    <p className="text-xs text-[#0052CC] dark:text-blue-400 font-medium mt-0.5">
                      Fast & secure 1-tap verification
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0052CC] group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                <span className="px-3 text-xs uppercase font-bold text-slate-400">or</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* SMS OTP Option */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 bg-white dark:bg-slate-900 hover:bg-orange-50/20 dark:hover:bg-orange-950/20 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Verify with SMS
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Receive a 6-digit OTP code on your phone
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Dev Test Bypass */}
              {isDevMode && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDemoBypass}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-purple-400 bg-purple-950/30 hover:bg-purple-950/50 border border-purple-800/40 transition-colors"
                  >
                    ⚡ Instant Demo Bypass (Testing Mode)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: SMS OTP Verification Input */}
          {step === 'otp_input' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-500 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Enter the 6-digit verification code sent to <br />
                  <strong className="text-slate-900 dark:text-white">+91 {phone}</strong>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="block w-full text-center tracking-[0.5em] text-2xl py-3 border border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full flex justify-center py-3.5 px-4 rounded-2xl shadow-lg text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all"
              >
                {loading ? <PizzaLoader size="inline" /> : "Verify Code & Continue"}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select_method')}
                  className="hover:text-slate-700 dark:hover:text-slate-200"
                >
                  ← Other methods
                </button>

                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="font-bold text-orange-600 hover:text-orange-500"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              {isDevMode && (
                <button
                  type="button"
                  onClick={handleDemoBypass}
                  className="w-full py-2 text-xs font-bold text-purple-400 bg-purple-950/30 hover:bg-purple-950/50 border border-purple-800/40 rounded-xl transition-colors"
                >
                  ⚡ Instant Demo Bypass (Testing Mode)
                </button>
              )}
            </form>
          )}

        </div>
      </div>

      {/* Truecaller Desktop QR Modal */}
      {webSession && (
        <TruecallerQRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          deepLink={webSession.deepLink}
          requestId={webSession.requestId}
          onSuccess={handleQRSuccess}
          onError={handleQRError}
        />
      )}
    </div>
  );
}
