import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router";
import { parsePhoneNumber } from "libphonenumber-js";

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Phone validation
      let formattedPhone = "";
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
      const identityRef = doc(db, "customer_identities", formattedPhone);
      const identityDoc = await getDoc(identityRef);
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

      const deviceId = getDeviceId();

      // 3. Create Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      try {
        const userEmail = email.toLowerCase();
        const initialRole = userEmail === "olivepizzarjn@gmail.com" ? "owner" : "customer";
        
        await setDoc(identityRef, {
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
        });

        await setDoc(
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
        );

        // Trigger Welcome Email
        fetch("/api/email/transactional", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "REGISTER",
            data: { name: name || "", email: userEmail },
          }),
        }).catch((e) => console.error("Email trigger failed:", e));

        if (initialRole === "owner") navigate("/owner/dashboard");
        else navigate("/onboarding/location");
      } catch (syncErr) {
        console.warn("Firestore write failed. User created in Auth only.", syncErr);
        navigate("/onboarding/location");
      }
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

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
        console.warn("Firestore write failed.", syncErr);
        navigate("/onboarding/phone");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 glass-card">
      <h1 className="text-3xl font-bold mb-6 text-center text-primary-600">
        Create Account
      </h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
            required
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
      <div className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary-600 font-bold hover:underline"
        >
          Sign In
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
