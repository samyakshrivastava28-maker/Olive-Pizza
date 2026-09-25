import React, { useState, useEffect, useRef } from "react";
import { auth } from "../../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useAuthStore } from "../../lib/store";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { fetchApi } from "../../lib/config";
import { Mail, Sparkles, ArrowRight, RefreshCw, CheckCircle2, ChevronRight, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VerificationSuccess3D from "../../components/auth/VerificationSuccess3D";

export default function SetupEmail() {
  const { user, setUser, role } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMethod, setSuccessMethod] = useState<'email' | 'google' | 'phone'>('email');

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Finish onboarding helper
  const finalizeOnboarding = (emailLinked?: string, method: 'email' | 'google' | 'phone' = 'email') => {
    const updatedUser = {
      ...(user || {}),
      email: emailLinked || user?.email || undefined,
      emailVerified: Boolean(emailLinked),
      onboardingComplete: true,
    };
    setUser(updatedUser as any, role || 'customer');
    setSuccessMethod(method);
    setIsSuccess(true);
  };

  // 1. Send 4-digit code to email
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, purpose: "EMAIL_VERIFICATION" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send verification code. Please try again.");
      }

      toast.success("4-digit code sent to your inbox!");
      setCodeSent(true);
      setCooldown(60);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      console.error("[SetupEmail] Send code error:", err);
      setError(err.message || "Could not send verification code.");
      toast.error(err.message || "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify 4-digit code
  const handleVerifyCode = async (digits: string[]) => {
    const joined = digits.join("");
    if (joined.length !== 4) return;

    setLoading(true);
    setError("");

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetchApi("/api/auth/customer/link-email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: joined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid or expired verification code.");
      }

      toast.success("Email verified and linked successfully! 🎉");
      finalizeOnboarding(email.trim().toLowerCase(), "email");
    } catch (err: any) {
      console.error("[SetupEmail] Verify code error:", err);
      setError(err.message || "Verification failed. Please check the code.");
      toast.error(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d.length === 1)) {
      handleVerifyCode(newCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // 3. Continue with Google (Pre-verified!)
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const googleIdToken = await cred.user.getIdToken();
      const googleEmail = cred.user.email;

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : googleIdToken;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetchApi("/api/auth/customer/link-email", {
        method: "POST",
        headers,
        body: JSON.stringify({ googleIdToken }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to link Google account.");
      }

      toast.success("Connected with Google! Email pre-verified. 🎉");
      finalizeOnboarding(googleEmail || data.email, "google");
    } catch (err: any) {
      console.error("[SetupEmail] Google sign in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Could not connect with Google.");
        toast.error(err.message || "Google sign in failed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 4. Skip for now
  const handleSkip = async () => {
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
      if (token) {
        await fetchApi("/api/auth/customer/link-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ skip: true }),
        }).catch(() => {});
      }
    } catch {}

    toast("You can add an email later from your profile!", { icon: "ℹ️" });
    finalizeOnboarding(undefined, "phone");
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto w-full">
          <VerificationSuccess3D
            identifier={email || user?.phone || "Welcome to Olive Pizza"}
            method={successMethod}
            title="Account Created Successfully!"
            subtitle="Your account is completely set up. Welcome to Olive Pizza!"
            onContinue={() => navigate("/", { replace: true })}
            autoRedirectMs={2200}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Onboarding step badge */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 4 of 4 • Optional</span>
          </div>
        </div>

        <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 text-white mb-4">
          <Mail className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-900 dark:text-white tracking-tight">
          Add Your Email (Optional)
        </h1>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Your email helps us send you secret offers, special events, new products and updates that not everyone knows about. 🍕✨🎉
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-5 sm:px-8 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium"
            >
              {error}
            </motion.div>
          )}

          {/* Option A: Google 1-Tap Link (Pre-verified) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all font-bold text-sm text-slate-800 dark:text-white shadow-sm disabled:opacity-50"
          >
            {googleLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            )}
            <span>Continue with Google (Instant & Pre-verified)</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            <span className="px-3 text-xs uppercase font-bold text-slate-400">or enter manually</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Option B: Manual Email OTP */}
          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.includes("@")}
                className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 4-Digit Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-400">Code sent to:</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{email}</p>
              </div>

              <div className="flex justify-center gap-3">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (codeInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-14 h-16 text-center text-2xl font-mono font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setCodeSent(false)}
                  className="font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Change email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleSendCode()}
                  className="font-bold text-orange-600 hover:text-orange-700 disabled:text-slate-400 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Option C: Skip for Now */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-3 px-4 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Skip for Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
