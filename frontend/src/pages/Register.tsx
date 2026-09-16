import React, { useState, useEffect, useRef } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCustomToken,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, useSearchParams, Link } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../lib/store";
import PizzaLoader from "../components/ui/PizzaLoader";
import { Mail, User, Phone, CheckCircle2, ArrowRight, RefreshCw, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "../lib/config";

export default function Register() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const navigate = useNavigate();

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // 4-Digit Email OTP verification step
  const [step, setStep] = useState<'form' | 'verify_code'>('form');
  const [emailCode, setEmailCode] = useState(["", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // Step 1: Submit Details & Send Verification Code
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
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

      setStep('verify_code');
      setCooldown(60);
      toast.success("4-digit code sent to your email!");
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newCode = [...emailCode];
    newCode[index] = digit;
    setEmailCode(newCode);

    if (digit && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !emailCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify Code & Create Customer Account
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = emailCode.join('');
    if (fullCode.length !== 4) {
      setError("Please enter the complete 4-digit code.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? `+${cleanPhone}`
      : `+91${cleanPhone.slice(-10)}`;

    setError("");
    setLoading(true);

    try {
      // Call backend email signin with name
      const res = await fetchApi('/api/auth/email/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: fullCode,
          name: name.trim()
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !data?.customToken) {
        throw new Error(data?.message || "Invalid or expired verification code.");
      }

      // Establish session with customToken
      const userCredential = await signInWithCustomToken(auth, data.customToken);

      // Save phone number to user record
      await setDoc(doc(db, "users", userCredential.user.uid), {
        phone: formattedPhone,
        name: name.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      useAuthStore.getState().setUser({
        uid: userCredential.user.uid,
        email: cleanEmail,
        name: name.trim(),
        phone: formattedPhone,
        phoneVerified: false,
        phoneSetupCompleted: true,
        locationSetupCompleted: true,
        emailVerified: true,
      }, 'customer');

      toast.success("Account created successfully! Welcome to Olive Pizza! 🍕");
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to complete account registration.");
    } finally {
      setLoading(false);
    }
  };

  // Social Google Sign-in
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);

      const userRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: result.user.email?.toLowerCase(),
          name: result.user.displayName || "Customer",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          emailVerified: true
        });
      }

      useAuthStore.getState().setUser({
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || "Customer",
        photoURL: result.user.photoURL,
        emailVerified: true,
        phoneVerified: false,
      }, 'customer');

      toast.success("Welcome to Olive Pizza!");
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Google sign-in could not be completed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-rose-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-red-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl" />
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
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Join Olive Pizza for hot deals, exclusive rewards & rapid delivery
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(249,115,22,0.08)] border border-orange-100/80">
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

          {step === 'form' ? (
            <form onSubmit={handleInitiateSignup} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-slate-900 text-sm font-medium focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
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

              {/* Phone Number */}
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

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim() || phone.replace(/\D/g, '').length < 10}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer mt-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Continue with Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteSignup} className="space-y-5">
              <div className="text-center">
                <p className="text-xs text-slate-500">
                  Enter the 4-digit code sent to{" "}
                  <span className="font-bold text-slate-800">{email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-red-600 font-bold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Edit details
                </button>
              </div>

              {/* 4-Digit Input Boxes */}
              <div className="flex justify-center gap-3">
                {emailCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (codeInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
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
                    <span>Verify & Create Account</span>
                  </>
                )}
              </button>

              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="text-xs text-slate-400 font-medium">
                    Resend code in <span className="font-bold text-slate-600">{cooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleInitiateSignup(e)}
                    disabled={loading}
                    className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Resend 4-digit code
                  </button>
                )}
              </div>
            </form>
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
            <span>Sign up with Google</span>
          </button>
        </div>

        {/* Footer Navigation */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-red-600 font-bold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
