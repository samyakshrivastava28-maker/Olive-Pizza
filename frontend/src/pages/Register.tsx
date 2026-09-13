import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  signOut
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { auth, db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router";
import { useAuthStore } from "../lib/store";
import toast from "react-hot-toast";
import { withAuthRetry } from "../lib/authRetry";
import { translateError, logDetailedError } from "../lib/errorTranslator";
import PizzaLoader from "../components/ui/PizzaLoader";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "../lib/config";
import { Mail, KeyRound, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_fingerprint');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('device_fingerprint', deviceId);
  }
  return deviceId;
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 4-Digit Email Verification State
  const [step, setStep] = useState<'form' | 'verify_code'>('form');
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formattedPhoneState, setFormattedPhoneState] = useState("");

  const navigate = useNavigate();

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Authorize customer app access via canonical backend
  const verifyCustomerAccess = async (firebaseUser: any) => {
    try {
      const idToken = await firebaseUser.getIdToken();
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

  // Handle redirect result on mount (for mobile Google Sign-In)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user) {
        try {
          await verifyCustomerAccess(result.user);

          const userRef = doc(db, "users", result.user.uid);
          const userDoc = await getDoc(userRef);
          const userEmail = result.user.email?.toLowerCase() || "";

          if (!userDoc.exists()) {
            await setDoc(userRef, {
              email: userEmail,
              name: result.user.displayName || "",
              role: "customer",
              createdAt: new Date().toISOString(),
            });

            fetchApi("/api/email/auth/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: result.user.displayName || "", 
                email: userEmail,
                isReturning: false
              }),
            }).catch((e) => console.error("Email trigger failed:", e));
          }

          toast.success("Welcome to Olive Pizza!");
          if (userDoc.exists() && userDoc.data()?.phoneVerified) {
             navigate("/");
          } else {
             navigate("/onboarding/phone");
          }
        } catch (err: any) {
          logDetailedError(err, { context: "Register Redirect Result Sync" });
          toast.error(err?.message || "Failed to authorize customer access.");
          setError(err?.message || "This account cannot be used as a customer account.");
        }
      }
    }).catch((err) => {
      logDetailedError(err, { context: "Register Redirect Sign-In Error" });
    });
  }, [navigate]);

  // Step 1: Request 4-digit code to email
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Phone validation
      let formattedPhone = phone.trim();
      if (!formattedPhone) {
        setError("Mobile number is required");
        setLoading(false);
        return;
      }

      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/^\+?91/, '')}`;
      }

      const digitsOnly = formattedPhone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        setError("Please enter a valid 10-digit mobile number");
        setLoading(false);
        return;
      }

      setFormattedPhoneState(formattedPhone);

      // 2. Check phone uniqueness
      try {
        const identityRef = doc(db, "customer_identities", formattedPhone);
        const identityDoc = await getDoc(identityRef).catch(() => null);
        if (identityDoc?.exists()) {
          setError("Phone number already in use. One phone number can only be linked to one account.");
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Phone uniqueness check notice:', err);
      }

      // 3. Send 4-digit verification code to email
      const sendRes = await fetchApi('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'CUSTOMER_REGISTRATION'
        })
      });

      const sendData = await sendRes.json().catch(() => null);
      if (!sendRes.ok || !sendData?.success) {
        throw new Error(sendData?.message || 'Failed to send 4-digit verification code. Please try again.');
      }

      setStep('verify_code');
      setResendCooldown(60);
      toast.success("4-digit verification code sent to your email!");
    } catch (err: any) {
      setError(err?.message || translateError(err));
    } finally {
      setLoading(false);
    }
  };

  // Resend 4-digit code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const sendRes = await fetchApi('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'CUSTOMER_REGISTRATION'
        })
      });

      const sendData = await sendRes.json().catch(() => null);
      if (!sendRes.ok || !sendData?.success) {
        throw new Error(sendData?.message || 'Failed to resend code');
      }

      setResendCooldown(60);
      toast.success("New 4-digit code sent to your email!");
    } catch (err: any) {
      setError(err?.message || "Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and create user account
  const handleVerifyAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 4) {
      setError("Please enter the 4-digit verification code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. Verify code on backend
      const verifyRes = await fetchApi('/api/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim()
        })
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !verifyData?.success) {
        throw new Error(verifyData?.message || 'Invalid or expired verification code.');
      }

      // 2. Create Firebase Auth User
      const userEmail = email.toLowerCase().trim();
      const userCredential = await withAuthRetry(
        () => createUserWithEmailAndPassword(auth, userEmail, password),
        "Email Register"
      );

      const deviceId = getDeviceId();
      const formattedPhone = formattedPhoneState;

      // 3. Save Identity Doc
      try {
        const identityRef = doc(db, "customer_identities", formattedPhone || 'unknown');
        await setDoc(identityRef, {
          primaryUid: userCredential.user.uid,
          primaryEmail: userEmail,
          deviceId: deviceId,
          userAgent: navigator.userAgent,
          firstOrderCouponUsed: false,
          firstOrderDate: null,
          firstOrderCouponCode: null,
          totalOrders: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (idErr) {
        console.warn("Identity doc write notice:", idErr);
      }

      // 4. Save User Doc in Firestore
      await setDoc(
        doc(db, "users", userCredential.user.uid),
        {
          email: userEmail,
          name: name.trim(),
          role: "customer",
          phone: formattedPhone,
          phoneVerified: false,
          phoneSetupCompleted: false,
          locationSetupCompleted: false,
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 5. Update Auth Store
      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        email: userEmail,
        name: name.trim(),
        phone: formattedPhone,
        photoURL: userCredential.user.photoURL,
        phoneVerified: false,
        phoneSetupCompleted: false,
        locationSetupCompleted: false,
        emailVerified: true,
      }, "customer");

      // 6. Send Welcome Email
      fetchApi("/api/email/auth/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), 
          email: userEmail,
          isReturning: false
        }),
      }).catch((e) => console.error("Email trigger failed:", e));

      toast.success("Account created successfully!");
      navigate("/onboarding/phone");
    } catch (err: any) {
      setError(err?.message || translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
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
        result = await withAuthRetry(() => signInWithPopup(auth, provider), "Google Popup");
      }
      
      if (result && result.user) {
        await verifyCustomerAccess(result.user);

        const userRef = doc(db, "users", result.user.uid);
        const userDoc = await getDoc(userRef);
        const userEmail = result.user.email?.toLowerCase() || "";

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: userEmail,
            name: result.user.displayName || "",
            role: "customer",
            createdAt: new Date().toISOString(),
          });
          
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
        
        toast.success("Welcome to Olive Pizza!");
        navigate("/");
      }
    } catch (err: any) {
      setError(translateError(err));
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-md mx-auto my-6 sm:my-12 p-5 sm:p-8 glass-card overflow-hidden w-full">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 rounded-2xl"
          >
            <PizzaLoader 
              text={step === 'verify_code' ? "Verifying code..." : "Setting up account..."} 
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
          {step === 'verify_code' ? 'Verify Email' : 'Create Account'}
        </h1>
        <p className="text-xs text-slate-400 mt-1 text-center">
          {step === 'verify_code'
            ? `Enter the 4-digit verification code sent to ${email}`
            : 'Join Olive Pizza for exclusive offers & fast checkout'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm font-medium relative z-10 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Initial Registration Form */}
      {step === 'form' && (
        <form onSubmit={handleInitiateRegister} className="flex flex-col gap-4 relative z-10">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-[44px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-base sm:text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-base sm:text-sm"
            required
          />
          <div className="flex relative min-h-[44px]">
            <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold text-sm">
              +91
            </span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/^\+?91/, "").replace(/\D/g, '').slice(0, 10);
                setPhone(val);
              }}
              className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-r-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-base sm:text-sm"
              required
              maxLength={10}
            />
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12 text-base sm:text-sm"
              minLength={6}
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

          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold mt-2 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Sending Verification Code..." : "Continue to Verification"}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="min-h-[48px] flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>
        </form>
      )}

      {/* Step 2: 4-Digit Email Verification Code */}
      {step === 'verify_code' && (
        <form onSubmit={handleVerifyAndCreateAccount} className="space-y-5 relative z-10">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl text-center">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              We sent a 4-digit code to <strong>{email}</strong>. It expires in 5 minutes.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block text-center mb-2">
              4-Digit Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              maxLength={4}
              placeholder="0000"
              autoFocus
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full min-h-[52px] text-center tracking-[1em] text-3xl font-mono font-bold p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || verificationCode.length !== 4}
            className="w-full min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Verifying & Creating Account..." : "Verify & Complete Registration"}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setVerificationCode('');
                setError('');
              }}
              className="min-h-[44px] hover:text-slate-200 flex items-center gap-1 p-1"
            >
              <ArrowLeft size={14} /> Back / Edit Email
            </button>

            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={handleResendCode}
              className={`min-h-[44px] flex items-center gap-1 font-bold p-1 ${
                resendCooldown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-primary-500 hover:underline'
              }`}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm relative z-10">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary-600 font-bold hover:underline inline-block p-1"
        >
          Sign In
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
    </div>
  );
}


