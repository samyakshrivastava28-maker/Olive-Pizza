import React, { useState, useEffect, useRef } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithCustomToken,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, useSearchParams, Link } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../lib/store";
import {
  User,
  Phone,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Smartphone,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TruecallerService, TruecallerSessionStatusResponse } from "../plugins/Truecaller";
import TruecallerQRModal from "../components/auth/TruecallerQRModal";
import { fetchApi } from "../lib/config";

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, user: existingUser } = useAuthStore();

  // Steps: 'step1_input' -> 'step2_verify'
  const [currentStep, setCurrentStep] = useState<"step1_input" | "step2_verify">("step1_input");

  // Step 1: Name & Phone Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Verification Method & State
  const [verifyMode, setVerifyMode] = useState<"choose" | "sms_otp">("choose");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Truecaller Web QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [webSession, setWebSession] = useState<{ deepLink: string; requestId: string } | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Refs
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const cleanPhoneDigits = (raw: string) => raw.replace(/\D/g, "");
  const formatE164 = (raw: string) => {
    const digits = cleanPhoneDigits(raw);
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    return raw.startsWith("+") ? raw : `+91${digits}`;
  };

  // ─── STEP 1: PROCEED TO VERIFY ─────────────────────────────────────────────
  const handleProceedToVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const digits = cleanPhoneDigits(phone);

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setError("");
    setCurrentStep("step2_verify");
  };

  // Sync user profile helper
  const syncAuthenticatedCustomer = async (uid: string, formattedPhone: string, method: string) => {
    const customerName = name.trim() || "Customer";
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(
        userRef,
        {
          name: customerName,
          displayName: customerName,
          phone: formattedPhone,
          phoneVerified: true,
          phoneSetupCompleted: true,
          verificationMethod: method,
          role: "customer",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Also sync customer identities collection
      const identityRef = doc(db, "customer_identities", formattedPhone);
      await setDoc(
        identityRef,
        {
          primaryUid: uid,
          name: customerName,
          verifiedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn("[Register] Firestore sync notice:", firestoreErr);
    }

    // Update frontend auth store
    setUser(
      {
        uid,
        name: customerName,
        phone: formattedPhone,
        phoneVerified: true,
        phoneSetupCompleted: true,
        locationSetupCompleted: false,
        onboardingComplete: false,
      },
      "customer"
    );

    // Proceed to Step 3: Location
    navigate("/onboarding/location", { replace: true });
  };

  // ─── STEP 2 - CHOICE A: TRUECALLER 1-TAP / QR ─────────────────────────────
  const handleTruecallerVerification = async () => {
    const formatted = formatE164(phone);
    setLoading(true);
    setError("");

    try {
      if (TruecallerService.isNative()) {
        const isSupported = await TruecallerService.isNativeSupported();
        if (!isSupported) {
          toast("Truecaller is not installed on this device. Switching to SMS OTP verification.", { icon: "⚡" });
          setVerifyMode("sms_otp");
          await handleSendSmsOtp();
          return;
        }

        const nativeResult = await TruecallerService.verifyNative();
        const verifyRes = await TruecallerService.verifyOnBackend(nativeResult, undefined, formatted);

        if (verifyRes.success) {
          toast.success("Phone verified securely with Truecaller! ✓");
          let uid = auth.currentUser?.uid;
          if (verifyRes.customToken) {
            const cred = await signInWithCustomToken(auth, verifyRes.customToken);
            uid = cred.user.uid;
          }
          await syncAuthenticatedCustomer(uid || `phone_${cleanPhoneDigits(phone)}`, formatted, "truecaller");
        } else {
          throw new Error(verifyRes.error || "Truecaller verification was not approved.");
        }
      } else {
        // Web flow: create session
        const sessionRes = await TruecallerService.createWebSession(formatted);
        const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        setWebSession({ deepLink: sessionRes.deepLink, requestId: sessionRes.requestId });
        setQrModalOpen(true);

        if (isMobileBrowser) {
          window.location.href = sessionRes.deepLink;
        }
      }
    } catch (err: any) {
      console.error("[Register] Truecaller error:", err);
      let userFriendlyMsg = "Truecaller is temporarily unavailable. Please verify via SMS.";
      if (err.code === "TRUECALLER_CONFIG_MISSING") {
        userFriendlyMsg = "Truecaller verification is not configured for this environment. Please verify via SMS.";
      } else if (err.code === "RATE_LIMIT_EXCEEDED") {
        userFriendlyMsg = "Too many verification attempts. Please verify via SMS.";
      } else if (err.message && !err.message.includes("object Object")) {
        userFriendlyMsg = err.message;
      }
      setError(userFriendlyMsg);
      toast.error(userFriendlyMsg);
      // Automatically show SMS option
      setVerifyMode("sms_otp");
    } finally {
      setLoading(false);
    }
  };

  const handleQRSuccess = async (result: TruecallerSessionStatusResponse) => {
    setQrModalOpen(false);
    toast.success("Phone verified securely with Truecaller! ✓");
    const formatted = formatE164(phone);

    let uid = auth.currentUser?.uid;
    if (result.customToken) {
      try {
        const cred = await signInWithCustomToken(auth, result.customToken);
        uid = cred.user.uid;
      } catch (tokErr) {
        console.warn("[Register] Error signing in with customToken:", tokErr);
      }
    }
    await syncAuthenticatedCustomer(uid || `phone_${cleanPhoneDigits(phone)}`, formatted, "truecaller");
  };

  // ─── STEP 2 - CHOICE B: FIREBASE SMS OTP ───────────────────────────────────
  const getOrCreateRecaptchaVerifier = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {}
      recaptchaVerifierRef.current = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }
    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        setError("reCAPTCHA verification expired. Please tap send code again.");
      },
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const handleSendSmsOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = formatE164(phone);
    setError("");
    setLoading(true);

    try {
      const verifier = getOrCreateRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmationResult(confirmation);
      setVerifyMode("sms_otp");
      setCooldown(60);
      toast.success("6-digit SMS verification code sent! 📩");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      console.error("[Register] Firebase Phone Auth send error:", err);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }

      let msg = "Could not send SMS code. Please try again.";
      if (err.code === "auth/invalid-phone-number") {
        msg = "The mobile number format is invalid.";
      } else if (err.code === "auth/quota-exceeded") {
        msg = "SMS quota exceeded. Please try again later or verify with Truecaller.";
      } else if (err.code === "auth/captcha-check-failed") {
        msg = "reCAPTCHA verification failed. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
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

  const handleVerifySmsOtp = async (digits: string[]) => {
    const code = digits.join("");
    if (code.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const formatted = formatE164(phone);
      let userCredential;

      if (confirmationResult) {
        userCredential = await confirmationResult.confirm(code);
      } else {
        // Fallback backend route
        const res = await fetchApi("/api/phone/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: formatted,
            otp: code,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Invalid OTP code.");
        }
        userCredential = { user: auth.currentUser || { uid: `phone_${cleanPhoneDigits(phone)}` } };
      }

      // Update Firebase Auth user display name if applicable
      if (auth.currentUser && name.trim()) {
        await updateProfile(auth.currentUser, { displayName: name.trim() }).catch(() => {});
      }

      toast.success("Phone verified successfully! ✓");
      await syncAuthenticatedCustomer(
        userCredential.user.uid,
        userCredential.user.phoneNumber || formatted,
        "firebase_sms"
      );
    } catch (err: any) {
      console.error("[Register] Verify OTP error:", err);
      let msg = "Invalid or expired OTP code. Please check and try again.";
      if (err.code === "auth/invalid-verification-code") {
        msg = "Incorrect OTP code. Please verify the 6 digits.";
      } else if (err.code === "auth/code-expired") {
        msg = "This verification code has expired. Please request a new one.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d.length === 1)) {
      handleVerifySmsOtp(newDigits);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Permanent, invisible reCAPTCHA container */}
      <div id="recaptcha-container" className="fixed bottom-0 right-0 z-0 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {currentStep === "step1_input"
                ? "Step 1 of 4 • Account Info"
                : "Step 2 of 4 • Verify Phone"}
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-900 dark:text-white tracking-tight">
          {currentStep === "step1_input" ? "Create Your Account" : "Verify Your Phone"}
        </h1>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
          {currentStep === "step1_input"
            ? "Enter your name and mobile number to start ordering hot, delicious pizza."
            : `We need to verify +91 ${cleanPhoneDigits(phone)} to secure your orders.`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-5 sm:px-8 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: NAME + PHONE NUMBER FORM
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === "step1_input" && (
            <form onSubmit={handleProceedToVerify} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samyak Shrivastava"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Mobile Number *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-sm text-slate-500 dark:text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    className="w-full pl-14 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tracking-wider text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!name.trim() || cleanPhoneDigits(phone).length !== 10}
                  className="w-full py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Log In
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: VERIFY PHONE (CHOICE A: TRUECALLER | CHOICE B: SMS)
              ══════════════════════════════════════════════════════════════════ */}
          {currentStep === "step2_verify" && (
            <div className="space-y-6">
              {/* Phone preview card with change button */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-750 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Verifying Number
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      +91 {cleanPhoneDigits(phone)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep("step1_input");
                    setVerifyMode("choose");
                    setError("");
                  }}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>

              {/* Mode A & B Selection Screen */}
              {verifyMode === "choose" && (
                <div className="space-y-3.5">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Select Verification Method
                  </span>

                  {/* Choice A: Truecaller 1-Tap / QR */}
                  <button
                    type="button"
                    onClick={handleTruecallerVerification}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#0052CC]/30 hover:border-[#0052CC] bg-[#0052CC]/5 dark:bg-[#0052CC]/10 hover:bg-[#0052CC]/15 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0052CC] text-white flex items-center justify-center shadow-md shadow-[#0052CC]/20">
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
                          Instant 1-Tap on mobile / QR scan on desktop
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#0052CC] group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="flex items-center my-3">
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                    <span className="px-3 text-xs uppercase font-bold text-slate-400">or</span>
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                  </div>

                  {/* Choice B: Via SMS */}
                  <button
                    type="button"
                    onClick={handleSendSmsOtp}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-500/50 bg-white dark:bg-slate-800 hover:bg-orange-50/20 dark:hover:bg-orange-950/20 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Via SMS
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Receive 6-digit verification code by text
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {/* SMS OTP Input Screen */}
              {verifyMode === "sms_otp" && (
                <div className="space-y-5">
                  <div className="text-center">
                    <span className="text-xs font-semibold text-slate-400">
                      Enter the 6-digit code sent to +91 {cleanPhoneDigits(phone)}:
                    </span>
                  </div>

                  <div className="flex justify-center gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none transition-all"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={loading || otpDigits.some((d) => d.length !== 1)}
                    onClick={() => handleVerifySmsOtp(otpDigits)}
                    className="w-full py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Continue</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setVerifyMode("choose")}
                      className="font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      ← Back to options
                    </button>
                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendSmsOtp()}
                      className="font-bold text-orange-600 hover:text-orange-700 disabled:text-slate-400 disabled:no-underline"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend SMS"}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep("step1_input")}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ← Edit Name or Mobile Number
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Truecaller Web QR Modal */}
      {webSession && (
        <TruecallerQRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          deepLink={webSession.deepLink}
          requestId={webSession.requestId}
          onSuccess={handleQRSuccess}
          onError={(msg) => {
            setError(msg);
            setVerifyMode("sms_otp");
          }}
          onSwitchToSms={() => {
            setQrModalOpen(false);
            setVerifyMode("sms_otp");
            handleSendSmsOtp();
          }}
        />
      )}
    </div>
  );
}
