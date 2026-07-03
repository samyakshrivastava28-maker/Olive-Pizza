import { useState } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { useAuthStore } from "../../lib/store";
import { parsePhoneNumber } from "libphonenumber-js";

export default function SetupPhone() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Strict Indian Phone Validation
    try {
      const phoneNumber = parsePhoneNumber(phone, "IN");
      if (
        !phoneNumber ||
        !phoneNumber.isValid() ||
        phoneNumber.country !== "IN"
      ) {
        setError("Please enter a valid Indian mobile number");
        return;
      }

      // Format securely to E.164 (+91XXXXXXX)
      const formattedPhone = phoneNumber.format("E.164");

      setLoading(true);
      setError("");

      // Check customer_identities collection for uniqueness
      const identityRef = doc(db, "customer_identities", formattedPhone);
      let identityDocExists = false;
      let isFirstOrderCouponUsed = false;

      try {
        const identityDoc = await getDoc(identityRef);
        identityDocExists = identityDoc.exists();
        if (identityDoc.exists()) {
          const identityData = identityDoc.data();
          isFirstOrderCouponUsed = !!identityData?.firstOrderCouponUsed;
          if (identityData.primaryUid !== auth.currentUser.uid) {
            setError(
              "Phone number already in use. Please login using your existing account.",
            );
            setLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (err.code === 'unavailable' || err.message?.includes('offline')) {
          console.warn('Network offline during uniqueness check. Bypassing check.');
        } else {
          throw err;
        }
      }

      if (!identityDocExists) {
        // Register this phone number identity permanently
        let deviceId = localStorage.getItem('device_fingerprint');
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
          localStorage.setItem('device_fingerprint', deviceId);
        }

        await setDoc(identityRef, {
          primaryUid: auth.currentUser.uid,
          primaryEmail: auth.currentUser.email || "",
          deviceId: deviceId,
          userAgent: navigator.userAgent,
          firstOrderCouponUsed: false,
          firstOrderDate: null,
          firstOrderCouponCode: null,
          totalOrders: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        });
      }

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        phone: formattedPhone,
        phoneSetupCompleted: true,
        firstOrderEligible: !identityDocExists || !isFirstOrderCouponUsed,
      });

      const currentUser = useAuthStore.getState().user;
      const currentRole = useAuthStore.getState().role;
      useAuthStore.getState().setUser({
        ...currentUser,
        phone: formattedPhone,
        phoneSetupCompleted: true,
        firstOrderEligible: !identityDocExists || !isFirstOrderCouponUsed,
      }, currentRole || 'customer');

      navigate("/onboarding/location");
    } catch (err: any) {
      setError(err.message || "Failed to save phone number");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 glass-card">
      <h1 className="text-3xl font-bold mb-4 text-center text-primary-600">
        Contact Details
      </h1>
      <p className="text-slate-600 mb-6 text-center">
        Our delivery partners need a way to contact you.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSavePhone} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <div className="flex relative">
            <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
              +91
            </span>
            <input
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => {
                // Strip +91 if they accidentally paste it
                const val = e.target.value.replace(/^\+?91/, "").trim();
                setPhone(val);
              }}
              className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-r-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              required
              maxLength={12}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-lg font-bold mt-4 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
