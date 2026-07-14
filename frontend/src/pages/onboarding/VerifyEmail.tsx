import { useState, useEffect } from "react";
// Removed sendEmailVerification
import { auth } from "../../lib/firebase";
import { useAuthStore } from "../../lib/store";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";

export default function VerifyEmail() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

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

  const handleSendVerification = async () => {
    if (!auth.currentUser || cooldown > 0) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/email/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: auth.currentUser.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification email");
      }
      toast.success("Verification email sent!");
      setMessage("Verification email sent! Please check your inbox and refresh this page.");
      setCooldown(60);
    } catch (err: any) {
      setError(
        err.message || "Failed to send verification email. Try again later.",
      );
      toast.error(err.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        useAuthStore.getState().setUser({
          ...user,
          emailVerified: true
        }, useAuthStore.getState().role || 'customer');
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 glass-card text-center">
      <h1 className="text-3xl font-bold mb-4 text-primary-600">
        Verify Your Email
      </h1>
      <p className="text-slate-600 mb-6">
        We need to verify your email address before you can order delicious
        pizzas.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-3 mt-8">
        <button
          onClick={handleSendVerification}
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Verification Email"}
        </button>
        <button
          onClick={handleRefresh}
          className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 p-3 rounded-lg font-bold transition-colors"
        >
          I've verified my email
        </button>
      </div>
    </div>
  );
}
