import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { parsePhoneNumber } from "libphonenumber-js";
import { Truecaller } from "../../plugins/Truecaller";
import { Loader2, Phone, ShieldCheck, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../lib/store";

export default function SetupPhone() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<'detect' | 'truecaller' | 'phone_input' | 'otp_input'>('detect');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, user, role } = useAuthStore();

  const fetchUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUser(
          {
            uid: uid,
            email: user?.email,
            name: data.name,
            phone: data.phone,
            photoURL: user?.photoURL || data.photoUrl,
            onboardingComplete: data.locationSetupCompleted,
            phoneSetupCompleted: data.phoneSetupCompleted,
            locationSetupCompleted: data.locationSetupCompleted,
            lat: data.lat,
            lng: data.lng,
            fullAddress: data.fullAddress,
            emailVerified: user?.emailVerified,
            approvalStatus: data.approvalStatus,
            status: data.status,
            photoUrl: data.photoUrl,
            vehicleType: data.vehicleType,
            vehicleNumber: data.vehicleNumber,
            vehicleImage: data.vehicleImage,
            earnings: data.earnings,
            metrics: data.metrics,
          },
          data.role || role || 'customer'
        );
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  useEffect(() => {
    checkTruecaller();
  }, []);

  const checkTruecaller = async () => {
    try {
      const result = await Truecaller.isSupported();
      if (result.isSupported) {
        setStep('truecaller');
      } else {
        setStep('phone_input');
      }
    } catch (err) {
      setStep('phone_input');
    }
  };

  const handleTruecallerVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await Truecaller.verify();
      
      // Send payload to backend
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/phone/truecaller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(response)
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Phone verified securely!");
        await fetchUserProfile(auth.currentUser?.uid!);
        navigate("/dashboard");
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Truecaller verification failed. Falling back to OTP.");
      setStep('phone_input'); // Fallback to OTP
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const phoneNumber = parsePhoneNumber(phone, "IN");
      if (!phoneNumber || !phoneNumber.isValid() || phoneNumber.country !== "IN") {
        setError("Please enter a valid Indian mobile number");
        return;
      }
      
      const formattedPhone = phoneNumber.format("E.164");
      
      setLoading(true);
      setError("");

      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone: formattedPhone })
      });
      const data = await res.json();

      if (data.success) {
        toast.success("OTP Sent!");
        setStep('otp_input');
      } else {
        setError(data.error || "Failed to send OTP.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError("");

    try {
      const phoneNumber = parsePhoneNumber(phone, "IN")!.format("E.164");
      const token = await auth.currentUser.getIdToken();
      
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone: phoneNumber, code: otp })
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Phone verified successfully!");
        await fetchUserProfile(auth.currentUser.uid);
        navigate("/dashboard");
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
             <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Verify your phone
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Secure your account to place orders
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
          
          {step === 'detect' && (
             <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 animate-pulse">Detecting secure verification methods...</p>
             </div>
          )}

          {step === 'truecaller' && (
            <div className="space-y-6 flex flex-col items-center">
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl w-full text-center border border-blue-100 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Truecaller Detected ✓</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Verify instantly with one tap.</p>
               </div>
               
               <button
                  onClick={handleTruecallerVerify}
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0052CC] hover:bg-[#0040A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
               >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify with Truecaller"}
               </button>
               
               <button onClick={() => setStep('phone_input')} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  Use SMS OTP instead
               </button>
            </div>
          )}

          {step === 'phone_input' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mobile Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    required
                    maxLength={10}
                    className="block w-full pl-12 pr-3 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
                    placeholder="9999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
              </button>
            </form>
          )}

          {step === 'otp_input' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
               <div className="text-center mb-6">
                  <MessageSquare className="w-12 h-12 text-orange-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                     Enter the 6-digit code sent to <br/><span className="font-bold text-slate-900 dark:text-white">+91 {phone}</span>
                  </p>
               </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="block w-full text-center tracking-widest text-2xl py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
