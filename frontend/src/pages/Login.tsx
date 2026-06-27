import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router";
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle redirect result on mount
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user) {
        try {
          const userRef = doc(db, "users", result.user.uid);
          const { getDoc } = await import("firebase/firestore");
          const userDoc = await getDoc(userRef);

          const userEmail = result.user.email?.toLowerCase() || "";
          const initialRole = userEmail === "olivepizzarjn@gmail.com" ? "owner" : "customer";
          let finalRole = initialRole;

          if (!userDoc.exists()) {
            await setDoc(userRef, {
              email: userEmail,
              name: result.user.displayName || "",
              role: initialRole,
              createdAt: new Date().toISOString(),
            });
          } else {
            finalRole = userDoc.data()?.role || "customer";
          }

          if (finalRole === "owner" || finalRole === "admin") navigate("/owner/dashboard");
          else if (finalRole === "delivery_partner") navigate("/delivery/dashboard");
          else navigate("/");
        } catch (err) {
          console.error("Firestore sync failed on redirect result", err);
        }
      }
    }).catch((err) => {
      console.error("Redirect sign-in error", err);
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // ReCaptcha Enterprise Assessment (Non-blocking as requested)
      try {
        if (typeof (window as any).grecaptcha !== 'undefined') {
          const grecaptcha = (window as any).grecaptcha;
          await new Promise<void>((resolve) => grecaptcha.enterprise.ready(resolve));
          const token = await grecaptcha.enterprise.execute('6LdqyDctAAAAABn8isXOdDe-0roVqILKuAdIl_x-', {action: 'LOGIN'});
          
          const response = await fetch('/api/auth/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'LOGIN' })
          });
          const data = await response.json();
          if (data.success === false) {
             console.warn("Recaptcha assessment failed or flagged:", data.reason);
          }
        }
      } catch (recaptchaError) {
        console.warn("Recaptcha execution failed, proceeding to login to not block workflow:", recaptchaError);
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const userRole = userDoc.data()?.role || "customer";

      toast.success("Welcome back!");

      if (userRole === "owner" || userRole === "admin")
        navigate("/owner/dashboard");
      else if (userRole === "delivery_partner") navigate("/delivery/dashboard");
      else navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // Directly use redirect on mobile to prevent popup blocking
      const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      if (isMobile) {
        await signInWithRedirect(auth, provider);
        return; // Exit here, the page will redirect
      }

      const result = await signInWithPopup(auth, provider);

      try {
        const userRef = doc(db, "users", result.user.uid);
        const { getDoc } = await import("firebase/firestore");
        const userDoc = await getDoc(userRef);

        const userEmail = result.user.email?.toLowerCase() || "";
        const initialRole =
          userEmail === "olivepizzarjn@gmail.com" ? "owner" : "customer";

        let finalRole = initialRole;

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: userEmail,
            name: result.user.displayName || "",
            role: initialRole,
            createdAt: new Date().toISOString(),
          });
        } else {
          finalRole = userDoc.data()?.role || "customer";
        }

        if (finalRole === "owner" || finalRole === "admin")
          navigate("/owner/dashboard");
        else if (finalRole === "delivery_partner")
          navigate("/delivery/dashboard");
        else navigate("/");
      } catch (syncErr) {
        console.warn("Firestore write failed.", syncErr);
        navigate("/");
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        console.warn("Popup blocked or closed, falling back to redirect...");
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider).catch((redirectErr) => {
          setError(redirectErr.message || "Failed to sign in with redirect");
          setLoading(false);
        });
        return; // Return early, let the redirect happen
      }
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 glass-card">
      <h1 className="text-3xl font-bold mb-6 text-center text-primary-600">
        Welcome Back
      </h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          required
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium text-sm"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-lg font-bold mt-2 transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
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
          className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>
      </form>
      <div className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-primary-600 font-bold hover:underline"
        >
          Create Account
        </Link>
      </div>

      <div className="mt-8 text-center text-[10px] font-medium text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
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
