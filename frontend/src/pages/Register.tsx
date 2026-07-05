import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router";
import { parsePhoneNumber } from "libphonenumber-js";
import toast from "react-hot-toast";
import { withAuthRetry } from "../lib/authRetry";
import { translateError, logDetailedError } from "../lib/errorTranslator";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_fingerprint');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('device_fingerprint', deviceId);
  }
  return deviceId;
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle redirect result on mount (for mobile Google Sign-In)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user) {
        try {
          const userRef = doc(db, "users", result.user.uid);
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

            fetch("/api/email/transactional", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "REGISTER",
                data: { name: result.user.displayName || "", email: userEmail },
              }),
            }).catch((e) => console.error("Email trigger failed:", e));
          } else {
            finalRole = userDoc.data()?.role || "customer";
          }

          if (finalRole === "owner" || finalRole === "admin") {
            toast.success("Welcome to Olive Pizza!");
            navigate("/owner/dashboard");
          } else if (finalRole === "delivery_partner") {
            toast.success("Welcome to Olive Pizza!");
            navigate("/delivery/dashboard");
          } else {
            toast.success("Welcome to Olive Pizza!");
            if (userDoc.exists() && userDoc.data()?.phoneSetupCompleted) {
               navigate("/");
            } else {
               navigate("/onboarding/phone");
            }
          }
        } catch (err) {
          logDetailedError(err, { context: "Register Redirect Result Sync" });
          console.error("Firestore sync failed on redirect result", err);
          navigate("/onboarding/phone");
        }
      }
    }).catch((err) => {
      logDetailedError(err, { context: "Register Redirect Sign-In Error" });
      console.error("Redirect sign-in error", err);
    });
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ReCaptcha Enterprise Assessment (Non-blocking as requested)
      try {
        if (typeof (window as any).grecaptcha !== 'undefined') {
          const grecaptcha = (window as any).grecaptcha;
          await new Promise<void>((resolve) => grecaptcha.enterprise.ready(resolve));
          const token = await grecaptcha.enterprise.execute('6LdqyDctAAAAABn8isXOdDe-0roVqILKuAdIl_x-', {action: 'REGISTER'});
          
          await withAuthRetry(() => fetch('/api/auth/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'REGISTER' })
          }).then(async res => {
             const data = await res.json();
             if (data.success === false) {
                console.warn("Recaptcha assessment failed or flagged:", data.reason);
             }
             return data;
          }), "Recaptcha Register", 1);
        }
      } catch (recaptchaError) {
        logDetailedError(recaptchaError, { context: "Recaptcha" });
        console.warn("Recaptcha execution failed, proceeding to register to not block workflow:", recaptchaError);
      }

      // 1. Phone validation
      let formattedPhone = "";
      const userEmail = email.toLowerCase();
      const initialRole = userEmail === "olivepizzarjn@gmail.com" ? "owner" : "customer";
      let identityDocExists = false;

      if (phone.trim() !== "") {
        try {
          const phoneNumber = parsePhoneNumber(phone, "IN");
          if (!phoneNumber || !phoneNumber.isValid() || phoneNumber.country !== "IN") {
            throw new Error("Invalid phone");
          }
          formattedPhone = phoneNumber.format("E.164");
        } catch (err) {
          setError("Please enter a valid Indian mobile number");
          setLoading(false);
          return;
        }

        // 2. Check for uniqueness
        try {
          const identityRef = doc(db, "customer_identities", formattedPhone);
          const identityDoc = await withAuthRetry(() => getDoc(identityRef), "Check Phone Uniqueness");
          identityDocExists = identityDoc.exists();
          if (identityDoc.exists()) {
            try {
              const { addDoc, collection } = await import("firebase/firestore");
              await addDoc(collection(db, "security_logs"), {
                action: "duplicate_phone_attempt",
                email: email,
                uid: "N/A",
                role: "customer",
                path: "/register",
                timestamp: new Date().toISOString(),
                details: `Attempted to register with already used phone ${formattedPhone}`
              });
            } catch (e) {
              console.error("Failed to log security event");
            }
            setError("Phone number already in use. One phone number can only be linked to one account.");
            setLoading(false);
            return;
          }
        } catch (err: any) {
          if (err.code === 'unavailable' || err.message?.includes('offline')) {
            console.warn('Network offline during uniqueness check. Bypassing check.');
          } else {
            throw err;
          }
        }
      } else if (initialRole !== 'owner') {
        setError("Phone number is required");
        setLoading(false);
        return;
      }

      const deviceId = getDeviceId();

      // 3. Create Auth
      const userCredential = await withAuthRetry(() => createUserWithEmailAndPassword(auth, email, password), "Email Register");

      try {
        const userEmail = email.toLowerCase();
        const initialRole = userEmail === "olivepizzarjn@gmail.com" ? "owner" : "customer";
        
        const identityRef = doc(db, "customer_identities", formattedPhone || 'unknown');

        if (formattedPhone && !identityDocExists) {
          await withAuthRetry(() => setDoc(identityRef, {
            primaryUid: userCredential.user.uid,
            primaryEmail: userEmail,
            deviceId: deviceId,
            userAgent: navigator.userAgent,
            firstOrderCouponUsed: false,
            firstOrderDate: null,
            firstOrderCouponCode: null,
            totalOrders: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
          }), "Create Identity Doc");
        }

        await withAuthRetry(() => setDoc(
          doc(db, "users", userCredential.user.uid),
          {
            email: userEmail,
            name: name || "",
            role: initialRole,
            phone: formattedPhone,
            phoneSetupCompleted: true,
            locationSetupCompleted: false,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        ), "Create User Doc");

        // Trigger Welcome Email
        fetch("/api/email/transactional", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "REGISTER",
            data: { name: name || "", email: userEmail },
          }),
        }).catch((e) => console.error("Email trigger failed:", e));

        toast.success("Welcome to Olive Pizza!");

        if (initialRole === "owner") navigate("/owner/dashboard");
        else navigate("/onboarding/location");
      } catch (syncErr) {
        logDetailedError(syncErr, { context: "Register Firestore Sync" });
        console.warn("Firestore write failed. User created in Auth only.", syncErr);
        toast.success("Welcome to Olive Pizza!");
        navigate("/onboarding/location");
      }
    } catch (err: any) {
      setError(translateError(err));
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
        await withAuthRetry(() => signInWithRedirect(auth, provider), "Google Redirect");
        return; // Exit here, the page will redirect
      }

      const result = await withAuthRetry(() => signInWithPopup(auth, provider), "Google Popup");

      try {
        const userRef = doc(db, "users", result.user.uid);
        const userDoc = await withAuthRetry(() => getDoc(userRef), "Fetch User Doc");

        const userEmail = result.user.email?.toLowerCase() || "";
        const initialRole = userEmail === "olivepizzarjn@gmail.com" ? "owner" : "customer";
        let finalRole = initialRole;

        if (!userDoc.exists()) {
          await withAuthRetry(() => setDoc(userRef, {
            email: userEmail,
            name: result.user.displayName || "",
            role: initialRole,
            createdAt: new Date().toISOString(),
          }), "Create Google User");

          fetch("/api/email/transactional", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "REGISTER",
              data: { name: result.user.displayName || "", email: userEmail },
            }),
          }).catch((e) => console.error("Email trigger failed:", e));
        } else {
          finalRole = userDoc.data()?.role || "customer";
        }

        if (finalRole === "owner" || finalRole === "admin")
          navigate("/owner/dashboard");
        else if (finalRole === "delivery_partner")
          navigate("/delivery/dashboard");
        else {
          if (userDoc.exists() && userDoc.data()?.phoneSetupCompleted) {
             navigate("/");
          } else {
             navigate("/onboarding/phone");
          }
        }
      } catch (syncErr) {
        logDetailedError(syncErr, { context: "Google Sign-In Sync" });
        console.warn("Firestore write failed.", syncErr);
        navigate("/onboarding/phone");
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider).catch((redirectErr) => {
           logDetailedError(redirectErr, { context: "Google Fallback Redirect" });
           setError(translateError(redirectErr));
           setLoading(false);
        });
        return;
      }
      setError(translateError(err));
    } finally {
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
            className="absolute inset-0 z-50 bg-[#020617]/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-primary-500 mb-4" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white font-bold tracking-wide"
            >
              Authenticating...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      <h1 className="text-3xl font-bold mb-6 text-center text-primary-600 relative z-10">
        Create Account
      </h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium relative z-10">
          {error}
        </div>
      )}
      <form onSubmit={handleRegister} className="flex flex-col gap-4 relative z-10">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          required
        />
        <div className="flex relative">
          <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
            +91
          </span>
          <input
            type="tel"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/^\+?91/, "").trim();
              setPhone(val);
            }}
            className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-r-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            required={email.toLowerCase() !== "olivepizzarjn@gmail.com"}
            maxLength={12}
          />
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12"
            minLength={6}
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
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-lg font-bold mt-2 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Register"}
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
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary-600 font-bold hover:underline"
        >
          Sign In
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
