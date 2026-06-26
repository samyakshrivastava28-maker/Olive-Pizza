import { useState, useEffect } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuthStore } from "../../lib/store";
import { useNavigate } from "react-router";

export default function VerifyEmail() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.emailVerified) {
      navigate("/onboarding/phone");
    }
  }, [user, navigate]);

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage(
        "Verification email sent! Please check your inbox and refresh this page.",
      );
    } catch (err: any) {
      setError(
        err.message || "Failed to send verification email. Try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
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
