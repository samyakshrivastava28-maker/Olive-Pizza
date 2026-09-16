import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useAuthStore } from "../../lib/store";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { fetchApi } from "../../lib/config";
import { Mail, CheckCircle2, RefreshCw, KeyRound } from "lucide-react";

export default function VerifyEmail() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const currentUserEmail = auth.currentUser?.email || user?.email;

  useEffect(() => {
    if (user?.emailVerified) {
      navigate("/onboarding/phone");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendCode = async () => {
    if (!currentUserEmail || cooldown > 0) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetchApi("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUserEmail, purpose: 'EMAIL_VERIFICATION' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send verification code");
      }
      toast.success("4-digit code sent to your email!");
      setMessage("Verification code sent! Please check your inbox and enter the 4 digits below.");
      setCodeSent(true);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Try again later.");
      toast.error(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserEmail || code.length !== 4) {
      setError("Please enter the 4-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/api/auth/email/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUserEmail, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid verification code");
      }

      // Backend verify-code endpoint already authoritatively updates emailVerified in Firestore

      setUser({
        ...user,
        emailVerified: true
      }, 'customer');

      toast.success("Email verified successfully!");
      navigate("/onboarding/phone");
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-12 p-5 sm:p-8 glass-card text-center w-full">
      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950/50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mail size={24} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-primary-600">
        Verify Your Email
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm break-all">
        We need to verify <strong>{currentUserEmail}</strong> before you can place orders.
      </p>

      {error && (
        <div className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 p-3 rounded-lg mb-4 text-sm font-medium">
          {message}
        </div>
      )}

      {!codeSent ? (
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleSendCode}
            disabled={loading || cooldown > 0}
            className="min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Sending Code..." : "Send 4-Digit Code"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4 mt-6">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-2">
              Enter 4-Digit Code
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
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full min-h-[52px] text-center tracking-[0.8em] text-3xl font-mono font-bold p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full min-h-[48px] bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>

          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={handleSendCode}
            className="min-h-[44px] text-xs text-primary-500 font-bold hover:underline disabled:text-slate-500 disabled:no-underline flex items-center justify-center mx-auto p-2"
          >
            {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend 4-digit code"}
          </button>
        </form>
      )}
    </div>
  );
}
