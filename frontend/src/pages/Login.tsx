import React, { useState, useEffect, useRef } from "react";
import {
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithCustomToken,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, useSearchParams, Link } from "react-router";
import toast from 'react-hot-toast';
import { useAuthStore } from "../lib/store";
import PizzaLoader from "../components/ui/PizzaLoader";
import { Mail, Phone, CheckCircle2, ArrowRight, RefreshCw, Smartphone, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "../lib/config";
import { TruecallerService, TruecallerSessionStatusResponse } from "../plugins/Truecaller";
import TruecallerQRModal from "../components/auth/TruecallerQRModal";

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const navigate = useNavigate();

  // Primary Tab: 'email' | 'phone'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // Email OTP state
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState<'enter_email' | 'enter_code'>('enter_email');
  const [emailCode, setEmailCode] = useState(["", "", "", ""]);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const emailInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Phone OTP (Firebase Phone Auth) & Truecaller state
  const [phone, setPhone] = useState("");
  const [phoneStep, setPhoneStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  const [phoneOtp, setPhoneOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [isTruecallerNative, setIsTruecallerNative] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [webSession, setWebSession] = useState<{ deepLink: string; requestId: string } | null>(null);

  // Common UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check Truecaller native availability
  useEffect(() => {
    TruecallerService.isNativeSupported().then(setIsTruecallerNative).catch(() => setIsTruecallerNative(false));
  }, []);

  // Cooldown countdowns
  useEffect(() => {
    if (emailCooldown > 0) {
      const t = setTimeout(() => setEmailCooldown(emailCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown > 0) {
      const t = setTimeout(() => setPhoneCooldown(phoneCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [phoneCooldown]);

  // ─────────────────────────────────────────────────────────────
  // 1. EMAIL OTP AUTHENTICATION
  // ─────────────────────────────────────────────────────────────
  const handleSendEmailCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetchApi('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to send verification code. Please try again.");
      }

      setEmailStep('enter_code');
      setEmailCooldown(60);
      toast.success("4-digit code sent to your email!");
      setTimeout(() => emailInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailCodeChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newCode = [...emailCode];
    newCode[index] = digit;
    setEmailCode(newCode);

    if (digit && index < 3) {
      emailInputRefs.current[index + 1]?.focus();
    }
  };

  const handleEmailKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !emailCode[index] && index > 0) {
      emailInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = emailCode.join('');
    if (fullCode.length !== 4) {
      setError("Please enter the complete 4-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetchApi('/api/auth/email/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: fullCode
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !data?.customToken) {
        throw new Error(data?.message || "Invalid or expired verification code.");
      }

      // Establish Firebase session with the issued custom token
      const userCredential = await signInWithCustomToken(auth, data.customToken);

      // Hydrate state
      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        email: data.user?.email || email.trim().toLowerCase(),
        name: data.user?.name || "Customer",
        phone: data.user?.phone || null,
        phoneVerified: Boolean(data.user?.phoneVerified),
        phoneSetupCompleted: Boolean(data.user?.phoneVerified),
        locationSetupCompleted: true,
        emailVerified: true,
      }, 'customer');

      toast.success("Welcome back to Olive Pizza! 🍕");
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. PHONE OTP (FIREBASE PHONE AUTH)
  // ─────────────────────────────────────────────────────────────
  const formatPhoneNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return `+${digits}`;
    }
    return `+91${digits.slice(-10)}`;
  };

  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const formatted = formatPhoneNumber(phone);
    setError("");
    setLoading(true);

    try {
      // Clear previous verifier instance if any
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }

      // Initialize invisible reCAPTCHA verifier for Firebase Phone Auth
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError("reCAPTCHA verification expired. Please try again.");
        }
      });
      recaptchaVerifierRef.current = verifier;

      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmationResult(confirmation);
      setPhoneStep('enter_otp');
      setPhoneCooldown(60);
      toast.success("Verification code sent via SMS!");
    } catch (err: any) {
      console.error("[Firebase Phone Auth] Send error:", err);
      let msg = "Could not send SMS code. Please try again.";
      if (err.code === 'auth/invalid-phone-number') {
        msg = "The mobile number format is invalid.";
      } else if (err.code === 'auth/quota-exceeded') {
        msg = "SMS quota exceeded. Please try again later or use Truecaller.";
      } else if (err.code === 'auth/captcha-check-failed') {
        msg = "reCAPTCHA verification failed. Please refresh and try again.";
      } else if (err.code === 'auth/too-many-requests') {
        msg = "Too many attempts. Please wait a few minutes before trying again.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtp || phoneOtp.length < 4) {
      setError("Please enter the verification code sent to your phone.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      let userCredential;
      if (confirmationResult) {
        userCredential = await confirmationResult.confirm(phoneOtp.trim());
      } else {
        // Fallback for dev / sandbox mode verification
        const formatted = formatPhoneNumber(phone);
        const res = await fetchApi('/api/phone/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'sms',
            phoneNumber: formatted,
            otp: phoneOtp.trim()
          })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data?.customToken) {
          throw new Error(data?.error || "Invalid OTP code. Please try again.");
        }
        userCredential = await signInWithCustomToken(auth, data.customToken);
      }

      const idToken = await userCredential.user.getIdToken();

      // Synchronize phone identity to Firestore collections
      const syncRes = await fetchApi('/api/phone/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }).catch(() => null);
      const syncData = syncRes ? await syncRes.json().catch(() => null) : null;

      const userData = syncData?.user || {};
      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email || userData.email || null,
        name: userData.name || userCredential.user.displayName || "Customer",
        phone: userCredential.user.phoneNumber || formatPhoneNumber(phone),
        phoneVerified: true,
        phoneSetupCompleted: true,
        locationSetupCompleted: true,
      }, 'customer');

      toast.success("Welcome to Olive Pizza! 🍕");
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      console.error("[Firebase Phone Auth] Verify error:", err);
      let msg = "Invalid or expired OTP code. Please try again.";
      if (err.code === 'auth/invalid-verification-code') {
        msg = "Incorrect OTP code. Please enter the 6-digit code received via SMS.";
      } else if (err.code === 'auth/code-expired') {
        msg = "The verification code has expired. Please request a new code.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. TRUECALLER 1-TAP (NATIVE), MOBILE WEB INTENT & WEB QR
  // ─────────────────────────────────────────────────────────────
  const handleTruecallerAuth = async () => {
    setError("");
    setLoading(true);

    try {
      if (isTruecallerNative) {
        // 1. Android Capacitor Native 1-Tap bottom sheet
        const nativeResult = await TruecallerService.verifyNative();
        const res = await fetchApi('/api/phone/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'truecaller',
            payload: nativeResult.payload,
            signature: nativeResult.signature,
            signatureAlgorithm: nativeResult.signatureAlgorithm
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !data?.customToken) {
          throw new Error(data?.error || "Truecaller verification failed on server.");
        }

        const userCredential = await signInWithCustomToken(auth, data.customToken);

        useAuthStore.getState().setUser({
          uid: userCredential.user.uid,
          email: data.user?.email || null,
          name: data.user?.name || "Customer",
          phone: data.user?.phone || null,
          phoneVerified: true,
          phoneSetupCompleted: true,
          locationSetupCompleted: true,
        }, 'customer');

        toast.success("Verified via Truecaller! Welcome!");
        navigate(redirectUrl, { replace: true });
      } else {
        // 2. Web Session (Mobile Browser DeepLink or Desktop QR Modal)
        const session = await TruecallerService.createWebSession();
        setWebSession(session);

        const isMobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
        if (isMobileBrowser && session.deepLink) {
          // On mobile browser, auto-trigger deep link intent to launch Truecaller app
          window.location.href = session.deepLink;
        }

        setQrModalOpen(true);
      }
    } catch (err: any) {
      let msg = "Truecaller is temporarily unavailable. Please verify via SMS.";
      if (err.code === 'TRUECALLER_CONFIG_MISSING') {
        msg = "Truecaller verification is not configured for this environment. Please verify via SMS.";
      } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
        msg = "Too many verification attempts. Please wait a few minutes or verify via SMS.";
      } else if (err.message && !err.message.includes('object Object')) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQrVerified = async (qrStatus: TruecallerSessionStatusResponse, sessionRequestId?: string) => {
    setQrModalOpen(false);
    if (!qrStatus.phone) return;

    const targetRequestId = sessionRequestId || webSession?.requestId;
    setLoading(true);
    try {
      const res = await fetchApi('/api/phone/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'truecaller',
          requestId: targetRequestId,
          phoneNumber: qrStatus.phone
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.customToken) {
        const userCredential = await signInWithCustomToken(auth, data.customToken);
        useAuthStore.getState().setUser({
          uid: userCredential.user.uid,
          email: data.user?.email || null,
          name: qrStatus.name || data.user?.name || "Customer",
          phone: qrStatus.phone,
          phoneVerified: true,
          phoneSetupCompleted: true,
          locationSetupCompleted: true,
        }, 'customer');
        toast.success("Verified via Truecaller! Welcome!");
        navigate(redirectUrl, { replace: true });
      } else {
        throw new Error(data?.error || "Failed to finalize session after QR scan.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to finalize session after QR scan.");
      toast.error(err.message || "Failed to finalize session after QR scan.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. GOOGLE SIGN-IN (Cross-platform Web & Capacitor Native)
  // ─────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      let firebaseUser: any = null;

      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const nativeResult = await FirebaseAuthentication.signInWithGoogle();
        const idToken = nativeResult.credential?.idToken;
        if (!idToken) {
          throw new Error('Google Sign-In failed on mobile device.');
        }
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);
        firebaseUser = cred.user;
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        firebaseUser = result.user;
      }

      if (!firebaseUser) {
        throw new Error('Could not complete Google authentication.');
      }

      // Canonical Backend Authorization & User Profile Resolution
      let serverUser: any = null;
      try {
        const token = await firebaseUser.getIdToken();
        const authRes = await fetchApi('/api/auth/authorize-app', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetApp: 'CUSTOMER' })
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.authorized) {
            serverUser = authData.user;
          }
        }
      } catch (authErr) {
        console.warn('[Login] Backend authorize-app notice:', authErr);
      }

      // Non-blocking client record sync for customer fields
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: firebaseUser.email?.toLowerCase(),
            name: serverUser?.name || firebaseUser.displayName || "Customer",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (docErr) {
        console.warn('[Login] Client Firestore user doc sync notice:', docErr);
      }

      useAuthStore.getState().setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: serverUser?.name || firebaseUser.displayName || "Customer",
        photoURL: firebaseUser.photoURL,
        emailVerified: true,
        phoneVerified: !!serverUser?.phone,
      }, 'customer');

      toast.success("Welcome to Olive Pizza!");
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        let msg = "Google sign-in could not be completed.";
        if (err.code === 'auth/popup-blocked') {
          msg = "Popup was blocked by your browser. Please allow popups for Olive Pizza or try with Email/Phone.";
        } else if (err.code === 'auth/unauthorized-domain') {
          msg = "This domain is not authorized for Google sign-in in Firebase Console.";
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-rose-500 selection:text-white">
      {/* Background Ambience: Warm pizza-kitchen glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-red-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform">
              <span className="text-2xl">🍕</span>
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Welcome to Olive Pizza
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Fast, wood-fired pizzas delivered piping hot to your door
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(249,115,22,0.08)] border border-orange-100/80">
          {/* Method Switcher Tabs */}
          <div className="flex bg-orange-50/70 p-1.5 rounded-2xl mb-6 border border-orange-100/60">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                authMethod === 'email'
                  ? 'bg-white text-slate-900 shadow-sm shadow-orange-950/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 text-rose-500" />
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setError("");
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                authMethod === 'phone'
                  ? 'bg-white text-slate-900 shadow-sm shadow-orange-950/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              Phone / Truecaller
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 mb-5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* TAB 1: EMAIL OTP */}
          {authMethod === 'email' && (
            <div>
              {emailStep === 'enter_email' ? (
                <form onSubmit={handleSendEmailCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-slate-900 text-sm font-medium focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 4-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailCode} className="space-y-5">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">
                      Code sent to <span className="font-bold text-slate-800">{email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setEmailStep('enter_email')}
                      className="text-xs text-red-600 font-bold hover:underline mt-1 cursor-pointer"
                    >
                      Change email
                    </button>
                  </div>

                  {/* 4-Digit Input Boxes */}
                  <div className="flex justify-center gap-3">
                    {emailCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (emailInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleEmailCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleEmailKeyDown(index, e)}
                        className="w-14 h-16 text-center text-2xl font-black bg-slate-50 border-2 border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-slate-900 focus:outline-none transition-all"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || emailCode.join('').length !== 4}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    {emailCooldown > 0 ? (
                      <p className="text-xs text-slate-400 font-medium">
                        Resend code in <span className="font-bold text-slate-600">{emailCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendEmailCode()}
                        disabled={loading}
                        className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Resend 4-digit code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: PHONE / TRUECALLER */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              {/* Truecaller 1-Tap Trigger */}
              <button
                type="button"
                onClick={handleTruecallerAuth}
                disabled={loading}
                className="w-full py-3.5 bg-[#0087FF] hover:bg-[#0074db] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>
                  {isTruecallerNative
                    ? 'Instant 1-Tap Truecaller'
                    : typeof window !== 'undefined' && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768)
                    ? 'Verify with Truecaller App'
                    : 'Verify with Truecaller (QR / 1-Tap)'}
                </span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  or via SMS OTP
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {phoneStep === 'enter_phone' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-sm font-bold text-slate-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="w-full pl-14 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-slate-900 text-sm font-medium focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, '').length < 10}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send SMS Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Enter SMS OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => setPhoneStep('enter_phone')}
                        className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="w-full px-4 py-3.5 bg-slate-50/70 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-center text-xl font-black tracking-widest text-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phoneOtp.length < 4}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    {phoneCooldown > 0 ? (
                      <p className="text-xs text-slate-400 font-medium">
                        Resend SMS in <span className="font-bold text-slate-600">{phoneCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendPhoneOtp()}
                        disabled={loading}
                        className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Resend SMS OTP
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
              <div id="recaptcha-container"></div>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              or
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Social Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Footer Navigation */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <Link
              to={`/register?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-red-600 font-bold hover:underline"
            >
              Sign up now
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Truecaller Web QR Modal */}
      {webSession && (
        <TruecallerQRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          deepLink={webSession.deepLink}
          requestId={webSession.requestId}
          onSuccess={handleQrVerified}
          onError={(err) => {
            setError(err);
          }}
          onSwitchToSms={() => {
            setQrModalOpen(false);
            setAuthMethod('phone');
          }}
          onRefreshSession={async () => {
            try {
              const session = await TruecallerService.createWebSession();
              setWebSession(session);
            } catch {
              setError("Failed to refresh Truecaller session.");
            }
          }}
        />
      )}
    </div>
  );
}
