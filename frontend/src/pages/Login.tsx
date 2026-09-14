import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithCustomToken
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router";
import toast from 'react-hot-toast';
import { useAuthStore } from "../lib/store";
import PizzaLoader from "../components/ui/PizzaLoader";
import { withAuthRetry } from "../lib/authRetry";
import { translateError, logDetailedError } from "../lib/errorTranslator";
import { Mail, Lock, EyeOff, Eye, AlertCircle, ArrowRight, User, Phone, CheckCircle2, ShieldCheck, Zap, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "../lib/config";
import { TruecallerService } from "../plugins/Truecaller";
import TruecallerQRModal from "../components/auth/TruecallerQRModal";

export default function Login() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [pinId, setPinId] = useState<string | null>(null);
  const [phoneOtpMode, setPhoneOtpMode] = useState<'infobip' | 'firebase'>('infobip');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [webSession, setWebSession] = useState<{ deepLink: string; requestId: string } | null>(null);
  const [truecallerLoading, setTruecallerLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Authorize customer app access via canonical backend
  const verifyCustomerAccess = async (userCredential: any) => {
    try {
      const idToken = await userCredential.user.getIdToken();
      const res = await fetchApi('/api/auth/authorize-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ targetApp: 'CUSTOMER' })
      });

      const data = await res.json().catch(() => null);

      if (res.status === 429) {
        await signOut(auth);
        throw new Error("Too many login attempts. Please try again later.");
      }

      if (res.status === 403 || !res.ok || !data?.authorized) {
        await signOut(auth);
        throw new Error(data?.reason || "This account is not authorized to access the customer application.");
      }

      return data;
    } catch (err: any) {
      throw err;
    }
  };

  // Handle redirect result on mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          try {
            await verifyCustomerAccess(result);

            const userRef = doc(db, "users", result.user.uid);
            const userDoc = await getDoc(userRef);

            const userEmail = result.user.email?.toLowerCase() || "";
            let finalRole = "customer";

            if (!userDoc.exists()) {
              await setDoc(userRef, {
                email: userEmail,
                name: result.user.displayName || "",
                role: "customer",
                createdAt: new Date().toISOString(),
              });
            } else {
              const data = userDoc.data();
              finalRole = data?.role || "customer";
              
              useAuthStore.getState().setUser({
                uid: result.user.uid,
                email: result.user.email,
                name: data?.name,
                phone: data?.phone,
                photoURL: result.user.photoURL || data?.photoUrl,
                phoneVerified: data?.phoneVerified ?? false,
                phoneSetupCompleted: data?.phoneVerified ? (data?.phoneSetupCompleted ?? true) : false,
                locationSetupCompleted: data?.locationSetupCompleted ?? !!data?.fullAddress,
                lat: data?.lat,
                lng: data?.lng,
                fullAddress: data?.fullAddress,
                emailVerified: result.user.emailVerified,
                status: data?.status,
              }, finalRole as any);
            }

            navigate("/");
          } catch (err: any) {
            logDetailedError(err, { context: "Redirect Result Sync" });
            toast.error(err?.message || "Failed to authorize customer access.");
          }
        }
      } catch (err: any) {
        logDetailedError(err, { context: "Redirect Sign-In Error" });
        toast.error(translateError(err));
      }
    };
    checkRedirect();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await withAuthRetry(() => signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      ), "Email Login");

      // Verify customer authorization and enforce rate limits
      await verifyCustomerAccess(userCredential);
      
      let data: any = null;
      try {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          data = userDoc.data();
        }
      } catch (docErr) {
        console.warn("User doc fetch notice:", docErr);
      }

      const userRole = data?.role || "customer";

      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: data?.name || userCredential.user.displayName || userCredential.user.email?.split('@')[0] || "Customer",
        phone: data?.phone || userCredential.user.phoneNumber,
        photoURL: userCredential.user.photoURL || data?.photoUrl,
        phoneVerified: data?.phoneVerified ?? false,
        phoneSetupCompleted: data?.phoneVerified ? (data?.phoneSetupCompleted ?? true) : false,
        locationSetupCompleted: data?.locationSetupCompleted ?? !!data?.fullAddress,
        lat: data?.lat,
        lng: data?.lng,
        fullAddress: data?.fullAddress,
        emailVerified: userCredential.user.emailVerified,
        approvalStatus: data?.approvalStatus,
        status: data?.status,
        photoUrl: data?.photoUrl,
      }, userRole as any);

      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      setError(err.message || translateError(err));
    } finally {
      setLoading(false);
    }
  };

  // 1. Send SMS OTP via Infobip with fallback to Firebase
  const handleSendInfobipOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? `+${cleanPhone}`
      : `+91${cleanPhone.slice(-10)}`;

    setPhoneLoading(true);

    try {
      const res = await fetchApi('/api/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        if (data.pinId) setPinId(data.pinId);
        setPhoneOtpMode('infobip');
        setOtpSent(true);
        toast.success(data.message || "SMS verification code sent!");
        return;
      }

      // If backend reports rate limit or specific issue, fall back to Firebase Recaptcha
      console.warn("[Login] Infobip SMS notice, attempting Firebase fallback:", data?.error);
      setPhoneOtpMode('firebase');
      await sendFirebasePhoneOtp(formattedPhone);
    } catch (err: any) {
      console.warn("[Login] Send OTP network issue, falling back to Firebase:", err);
      setPhoneOtpMode('firebase');
      try {
        await sendFirebasePhoneOtp(formattedPhone);
      } catch (fallbackErr: any) {
        setError(translateError(fallbackErr) || "Failed to send SMS code. Please try again.");
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const sendFirebasePhoneOtp = async (formattedPhone: string) => {
    if (!(window as any).recaptchaCustomerVerifier) {
      (window as any).recaptchaCustomerVerifier = new RecaptchaVerifier(auth, 'recaptcha-customer-login', {
        size: 'invisible',
        callback: () => {}
      });
    }

    const appVerifier = (window as any).recaptchaCustomerVerifier;
    const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    setConfirmationResult(confirmation);
    setOtpSent(true);
    toast.success("Verification code sent to your phone!");
  };

  // 2. Verify SMS OTP (Infobip signin or Firebase confirm)
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtp || phoneOtp.length < 4) return;

    setError("");
    setLoading(true);

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? `+${cleanPhone}`
      : `+91${cleanPhone.slice(-10)}`;

    try {
      if (phoneOtpMode === 'infobip') {
        const res = await fetchApi('/api/phone/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'sms',
            phoneNumber: formattedPhone,
            otp: phoneOtp.trim(),
            pinId: pinId || undefined
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !data?.customToken) {
          throw new Error(data?.error || "Invalid OTP code. Please try again.");
        }

        const userCredential = await signInWithCustomToken(auth, data.customToken);
        await verifyCustomerAccess(userCredential);

        useAuthStore.getState().setUser({
          uid: userCredential.user.uid,
          email: data.user?.email || null,
          name: data.user?.name || "Customer",
          phone: data.user?.phone || formattedPhone,
          phoneVerified: true,
          phoneSetupCompleted: true,
          locationSetupCompleted: true,
        }, 'customer');

        toast.success("Welcome back!");
        navigate("/");
      } else {
        // Firebase confirmation fallback
        if (!confirmationResult) throw new Error("Verification session expired. Please resend code.");
        const userCredential = await confirmationResult.confirm(phoneOtp.trim());
        await verifyCustomerAccess(userCredential);

        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        let userData: any = null;
        if (userDoc.exists()) {
          userData = userDoc.data();
        } else {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            phone: userCredential.user.phoneNumber,
            phoneVerified: true,
            phoneSetupCompleted: true,
            role: 'customer',
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        useAuthStore.getState().setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email || userData?.email,
          name: userData?.name || "Customer",
          phone: userCredential.user.phoneNumber,
          phoneVerified: true,
          phoneSetupCompleted: true,
          locationSetupCompleted: userData?.locationSetupCompleted ?? false,
          emailVerified: userCredential.user.emailVerified,
        }, 'customer');

        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Truecaller 1-Tap & Web QR Login
  const handleTruecallerSignIn = async () => {
    setError("");
    setTruecallerLoading(true);

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : (cleanPhone.startsWith('91') ? `+${cleanPhone}` : undefined);

    try {
      if (TruecallerService.isNative()) {
        const isSupported = await TruecallerService.isNativeSupported();
        if (!isSupported) {
          toast("Truecaller 1-Tap is available on devices with Truecaller app installed. Switching to fast SMS OTP.", { icon: '⚡' });
          return;
        }

        const nativeResult = await TruecallerService.verifyNative();
        
        const res = await fetchApi('/api/phone/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'truecaller',
            payload: nativeResult.payload,
            signature: nativeResult.signature,
            signatureAlgorithm: (nativeResult as any).signatureAlgorithm
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.customToken) {
          throw new Error(data.error || "Truecaller authentication rejected.");
        }

        const userCredential = await signInWithCustomToken(auth, data.customToken);
        await verifyCustomerAccess(userCredential);

        useAuthStore.getState().setUser({
          uid: userCredential.user.uid,
          email: data.user?.email || null,
          name: data.user?.name || "Customer",
          phone: data.user?.phone,
          phoneVerified: true,
          phoneSetupCompleted: true,
          locationSetupCompleted: true,
        }, 'customer');

        toast.success("Welcome back! Verified via Truecaller ✓");
        navigate("/");
      } else {
        const sessionRes = await TruecallerService.createWebSession(formattedPhone);
        const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobileBrowser) {
          setWebSession({ deepLink: sessionRes.deepLink, requestId: sessionRes.requestId });
          setQrModalOpen(true);
          window.location.href = sessionRes.deepLink;
        } else {
          setWebSession({ deepLink: sessionRes.deepLink, requestId: sessionRes.requestId });
          setQrModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error("[Login] Truecaller error:", err);
      const msg = err.message || "Truecaller verification was cancelled or unavailable.";
      setError(msg);
      toast.error(msg);
    } finally {
      setTruecallerLoading(false);
    }
  };

  const handleTruecallerQRSuccess = async (result: any) => {
    setQrModalOpen(false);
    setLoading(true);
    try {
      if (!webSession?.requestId) throw new Error("Session expired");

      const res = await fetchApi('/api/phone/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'truecaller',
          requestId: webSession.requestId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.customToken) {
        throw new Error(data.error || "Failed to sign in with Truecaller.");
      }

      const userCredential = await signInWithCustomToken(auth, data.customToken);
      await verifyCustomerAccess(userCredential);

      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        email: data.user?.email || null,
        name: data.user?.name || "Customer",
        phone: data.user?.phone || result.phone,
        phoneVerified: true,
        phoneSetupCompleted: true,
        locationSetupCompleted: true,
      }, 'customer');

      toast.success("Welcome back! Verified via Truecaller ✓");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Truecaller sign-in failed.");
      toast.error(err.message || "Truecaller sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    
    const isLocalNetworkIP = window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);
    if (isLocalNetworkIP && !Capacitor.isNativePlatform()) {
      toast.error("Google Login blocks local network IPs (e.g., 192.168.x.x). Please test using 'localhost' or your Vercel deployment.");
      setLoading(false);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      let result;
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const nativeResult = await FirebaseAuthentication.signInWithGoogle();
        if (nativeResult.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(nativeResult.credential.idToken);
          result = await signInWithCredential(auth, credential);
        } else {
          throw new Error("Google Sign-In failed on device.");
        }
      } else {
        result = await signInWithPopup(auth, provider);
      }
      
      if (result && result.user) {
        // Enforce customer app authorization (blocks owners)
        await verifyCustomerAccess(result);

        const userRef = doc(db, "users", result.user.uid);
        let userDoc: any = null;
        try {
          userDoc = await getDoc(userRef);
        } catch (fsErr) {
          console.warn("User doc fetch notice:", fsErr);
        }

        const userEmail = result.user.email?.toLowerCase() || "";

        if (!userDoc?.exists()) {
          await setDoc(userRef, {
            email: userEmail,
            name: result.user.displayName || "",
            role: "customer",
            createdAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});

          fetchApi("/api/email/auth/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: result.user.displayName || "", 
              email: userEmail,
              isReturning: false
            }),
          }).catch((e) => console.error("Email trigger failed:", e));

          useAuthStore.getState().setUser({
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || "",
            photoURL: result.user.photoURL,
            emailVerified: result.user.emailVerified,
            onboardingComplete: false,
            phoneSetupCompleted: false,
            locationSetupCompleted: false,
          }, "customer");
        } else {
          const data = userDoc.data();
          
          useAuthStore.getState().setUser({
            uid: result.user.uid,
            email: result.user.email,
            name: data?.name,
            phone: data?.phone,
            photoURL: result.user.photoURL || data?.photoUrl,
            phoneVerified: data?.phoneVerified ?? false,
            phoneSetupCompleted: data?.phoneVerified ? (data?.phoneSetupCompleted ?? true) : false,
            locationSetupCompleted: data?.locationSetupCompleted ?? !!data?.fullAddress,
            lat: data?.lat,
            lng: data?.lng,
            fullAddress: data?.fullAddress,
            emailVerified: result.user.emailVerified,
            status: data?.status,
          }, "customer");
        }

        toast.success("Welcome!");
        navigate("/");
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && !err.message?.includes('closed-by-user')) {
        setError(err.message || translateError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-md mx-auto my-6 sm:my-12 p-5 sm:p-8 glass-card overflow-hidden w-full">
      <div id="recaptcha-customer-login"></div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 rounded-2xl"
          >
            <PizzaLoader 
              text="Authenticating..." 
              overlayClassName="absolute inset-0 z-50 bg-[#020617]/90 backdrop-blur-sm rounded-2xl" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center mb-6 relative z-10">
        <img
          src="/logo-transparent.png"
          alt="Olive Pizza Logo"
          className="h-16 w-auto object-contain mb-3 bg-transparent drop-shadow-lg"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-primary-500 tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sign in to your Olive Pizza account</p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm font-medium relative z-10 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Credential Selection Prompt */}
      <div className="mb-5 relative z-10">
        <label className="text-xs font-bold text-slate-400 block text-center mb-2">
          How would you like to log in?
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setError('');
            }}
            className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              authMethod === 'email'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Mail size={14} /> Email
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setError('');
            }}
            className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              authMethod === 'phone'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Phone size={14} /> Phone Number
          </button>
        </div>
      </div>

      {/* Email Login Form */}
      {authMethod === 'email' && (
        <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-base sm:text-sm"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12 text-base sm:text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium text-sm p-1 min-h-[44px] flex items-center"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:underline inline-block py-1"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold mt-2 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}

      {/* Phone Login Form */}
      {authMethod === 'phone' && (
        <div className="space-y-4 relative z-10">
          {!otpSent ? (
            <form onSubmit={handleSendInfobipOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Mobile Number (India)
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus-within:ring-2 focus-within:ring-primary-500 min-h-[44px]">
                  <span className="bg-slate-100 dark:bg-slate-800 px-3.5 py-3 text-xs font-bold text-slate-500 flex items-center border-r border-slate-200 dark:border-slate-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full p-3 bg-transparent text-base sm:text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Truecaller 1-Tap Login */}
              <button
                type="button"
                onClick={handleTruecallerSignIn}
                disabled={truecallerLoading || phoneLoading}
                className="w-full min-h-[48px] bg-[#0087FF] hover:bg-[#0077E6] active:scale-[0.98] text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {truecallerLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting Truecaller...
                  </span>
                ) : (
                  <>
                    <Zap size={18} className="text-yellow-300 fill-yellow-300" />
                    1-Tap Login with Truecaller
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 my-1">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Or with OTP</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                type="submit"
                disabled={phoneLoading || phone.length < 10}
                className="w-full min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {phoneLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending SMS...
                  </span>
                ) : (
                  <>
                    <Phone size={16} />
                    Continue with SMS OTP
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code sent to <strong className="text-slate-200">+91 {phone}</strong>
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                maxLength={6}
                placeholder="123456"
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-[48px] text-center tracking-widest text-xl font-bold p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <button
                type="submit"
                disabled={loading || phoneOtp.length < 4}
                className="w-full min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={phoneLoading}
                  onClick={() => handleSendInfobipOtp()}
                  className="text-primary-500 hover:underline font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {phoneLoading ? "Resending..." : "Resend Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setPhoneOtp('');
                    setPinId(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 py-1 cursor-pointer"
                >
                  Change Number
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Social Divider */}
      <div className="relative flex py-2 items-center z-10">
        <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
        <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
        <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
      </div>

      {/* Google Sign-In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 relative z-10"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Continue with Google
      </button>

      <div className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm relative z-10">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-primary-600 font-bold hover:underline inline-block p-1"
        >
          Create Account
        </Link>
      </div>

      <div className="mt-8 text-center text-[10px] font-medium text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4 relative z-10">
        A Premium Website By{" "}
        <a
          href="https://28webhub.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-500 hover:text-primary-600 hover:underline transition-colors"
        >
          S-Web Hub
        </a>
      </div>

      {/* Truecaller QR Modal for Desktop */}
      {qrModalOpen && webSession && (
        <TruecallerQRModal
          deepLink={webSession.deepLink}
          requestId={webSession.requestId}
          onSuccess={handleTruecallerQRSuccess}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
}

