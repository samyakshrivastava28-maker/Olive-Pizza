import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router";
import toast from 'react-hot-toast';
import { useAuthStore } from "../lib/store";
import PizzaLoader from "../components/ui/PizzaLoader";
import { withAuthRetry } from "../lib/authRetry";
import { translateError, logDetailedError } from "../lib/errorTranslator";
import { Mail, Lock, EyeOff, Eye, AlertCircle, ArrowRight, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle redirect result on mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
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
              const data = userDoc.data();
              finalRole = data?.role || "customer";
              
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
              }, finalRole as "customer" | "owner" | "delivery_partner" | "admin");
            }

            if (finalRole === "owner" || finalRole === "admin") navigate("/owner/dashboard");
            else if (finalRole === "delivery_partner") navigate("/delivery/dashboard");
            else navigate("/");
          } catch (err) {
            logDetailedError(err, { context: "Redirect Result Sync" });
            console.error("Firestore sync failed on redirect result", err);
            toast.error("Failed to sync user data after login.");
          }
        }
      } catch (err: any) {
        logDetailedError(err, { context: "Redirect Sign-In Error" });
        console.error("Redirect sign-in error", err);
        toast.error(translateError(err));
      }
    };
    checkRedirect();
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
          await Promise.race([
            new Promise<void>((resolve) => grecaptcha.enterprise.ready(resolve)),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error("ReCaptcha timeout")), 3000))
          ]);
          const token = await grecaptcha.enterprise.execute('6LdqyDctAAAAABn8isXOdDe-0roVqILKuAdIl_x-', {action: 'LOGIN'});
          
          await withAuthRetry(() => fetch('/api/auth/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'LOGIN' })
          }).then(async res => {
             const data = await res.json();
             if (data.success === false) {
                console.warn("Recaptcha assessment failed or flagged:", data.reason);
             }
             return data;
          }), "Recaptcha Login", 1);
        }
      } catch (recaptchaError) {
        logDetailedError(recaptchaError, { context: "Recaptcha" });
        console.warn("Recaptcha execution failed, proceeding to login to not block workflow:", recaptchaError);
      }

      const userCredential = await withAuthRetry(() => signInWithEmailAndPassword(
        auth,
        email,
        password,
      ), "Email Login");
      
      const { getDoc } = await import("firebase/firestore");
      const userDoc = await withAuthRetry(() => getDoc(doc(db, "users", userCredential.user.uid)), "Fetch User Doc");
      const data = userDoc.data();
      const userRole = data?.role || "customer";

      if (userDoc.exists()) {
        useAuthStore.getState().setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: data?.name,
          phone: data?.phone,
          photoURL: userCredential.user.photoURL || data?.photoUrl,
          phoneVerified: data?.phoneVerified ?? false,
          phoneSetupCompleted: data?.phoneVerified ? (data?.phoneSetupCompleted ?? true) : false,
          locationSetupCompleted: data?.locationSetupCompleted ?? !!data?.fullAddress,
          lat: data?.lat,
          lng: data?.lng,
          fullAddress: data?.fullAddress,
          emailVerified: userCredential.user.emailVerified,
          approvalStatus: data?.approvalStatus,
          status: data?.status,
          photoUrl: data?.photoUrl,
        }, userRole as "customer" | "owner" | "delivery_partner" | "admin");
      }

      toast.success("Welcome back!");

      if (userRole === "owner" || userRole === "admin" || userRole === "developer" || ["olivepizzarjn@gmail.com", "webhub2811@gmail.com"].includes(email.toLowerCase()))
        navigate("/owner/dashboard");
      else if (userRole === "delivery_partner") navigate("/delivery/dashboard");
      else navigate("/");
    } catch (err: any) {
      setError(err.message || translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    
    const isLocalNetworkIP = window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);
    if (isLocalNetworkIP && !Capacitor.isNativePlatform()) {
      toast.error("Google Login blocks local network IPs (e.g., 192.168.x.x). Please test using 'localhost' or your Vercel deployment.");
      setLoading(false);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      let result;
      // Use native plugin on Android to avoid WebView storage issues
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
        const userRef = doc(db, "users", result.user.uid);
        const { getDoc } = await import("firebase/firestore");
        const userDoc = await getDoc(userRef);

        const userEmail = result.user.email?.toLowerCase() || "";
        const initialRole = ["olivepizzarjn@gmail.com", "webhub2811@gmail.com"].includes(userEmail) ? "owner" : "customer";
        let finalRole = initialRole;

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: userEmail,
            name: result.user.displayName || "",
            role: initialRole,
            createdAt: new Date().toISOString(),
          });

          fetch("/api/email/auth/welcome", {
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
          }, initialRole as "customer" | "owner" | "delivery_partner" | "admin");
        } else {
          const data = userDoc.data();
          finalRole = data?.role || (["olivepizzarjn@gmail.com", "webhub2811@gmail.com"].includes(userEmail) ? "owner" : "customer");
          
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
          }, finalRole as "customer" | "owner" | "delivery_partner" | "admin");
        }

        toast.success("Welcome!");
        if (finalRole === "owner" || finalRole === "admin" || finalRole === "developer" || ["olivepizzarjn@gmail.com", "webhub2811@gmail.com"].includes(userEmail)) navigate("/owner/dashboard");
        else if (finalRole === "delivery_partner") navigate("/delivery/dashboard");
        else navigate("/");
      }
    } catch (err: any) {
      logDetailedError(err, { context: "Google Login" });
      const errMsg = err.message || translateError(err);
      
      // Specifically check for Varnish 503 or network errors
      if (errMsg.includes('503') || errMsg.includes('network') || errMsg.includes('backend read error') || errMsg.includes('Varnish')) {
        const customMsg = "Google's authentication servers are temporarily unavailable in your region. Please log in with Email & Password.";
        setError(customMsg);
        toast.error(customMsg, { duration: 6000 });
      } else {
        setError(errMsg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-md mx-auto mt-16 p-8 glass-card overflow-hidden">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 rounded-2xl"
          >
            <PizzaLoader 
              text="Authenticating..." 
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
        <h1 className="text-3xl font-extrabold text-center text-primary-500 tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sign in to your Olive Pizza account</p>
      </div>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium relative z-10">
          {error}
        </div>
      )}
      <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
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
      <div className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm relative z-10">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-primary-600 font-bold hover:underline"
        >
          Create Account
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

