import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
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
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 glass-card">
      <h1 className="text-3xl font-bold mb-6 text-center text-primary-600">
        Reset Password
      </h1>
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

      <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm text-center">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-lg font-bold mt-2 transition-colors disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <div className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm">
        Remembered?{" "}
        <Link
          to="/login"
          className="text-primary-600 font-bold hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
