import { useState } from "react";
// Removed sendPasswordResetEmail
import { auth } from "../lib/firebase";
import { Link } from "react-router";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/email/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send reset email");
      }
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#FAF8F5]">
      <div className="max-w-md w-full p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-black mb-2 text-center text-slate-900 tracking-tight">
          Reset Password
        </h1>
        <p className="text-slate-500 mb-6 text-xs sm:text-sm text-center">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl mb-4 text-xs font-semibold">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl mb-4 text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-[#FAF8F5] text-slate-900 text-sm focus:outline-none focus:border-primary-600 focus:bg-white transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-champagne p-3.5 rounded-xl font-bold text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-6 text-center text-slate-500 text-xs">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="text-primary-700 font-bold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
