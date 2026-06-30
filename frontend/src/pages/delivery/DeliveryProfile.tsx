import { useEffect, useState } from "react";
import { useAuthStore } from "../../lib/store";
import { auth, db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router";
import { GlassCard } from "../../components/ui/glass/GlassSystem";
import { User, LogOut, Settings, HelpCircle, Car, Calendar, ShieldCheck, Camera, CreditCard, Bell } from "lucide-react";
import { motion } from "framer-motion";

export default function DeliveryProfile() {
  const { user: authUser, logout } = useAuthStore();
  const [user, setUser] = useState<any>(authUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUser((prev: any) => ({ ...(prev || authUser), ...docSnap.data() }));
      }
    });
    return () => unsubscribe();
  }, [authUser?.uid]);

  const handleLogout = async () => {
    await auth.signOut();
    logout();
    navigate("/login");
  };

  const joinDate = user?.joinedAt 
    ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : user?.createdAt 
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
      : "Recently Joined";

  return (
    <div className="bg-dark-950 min-h-[100dvh] text-slate-200 pb-24 font-sans px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><User className="text-primary-500"/> Profile</h1>
          <button className="text-slate-400 hover:text-white"><Settings size={24}/></button>
        </div>

        {/* ID Card */}
        <GlassCard className="p-6 relative overflow-hidden bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-700">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={120} />
          </div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-primary-500 p-1">
                <img src={user?.photoUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=f97316&color=fff`} alt={user?.name} className="w-full h-full rounded-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 bg-dark-800 border border-dark-700 p-1.5 rounded-full text-slate-300 hover:text-white"><Camera size={14}/></button>
            </div>
            <div className="pt-2">
              <h2 className="text-2xl font-black text-white">{user?.name}</h2>
              <p className="text-sm text-slate-400 font-medium">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                <ShieldCheck size={12}/> {user?.approvalStatus === 'approved' ? 'Verified Partner' : (user?.approvalStatus || 'Pending')}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Vehicle Info */}
        <GlassCard className="p-6 border border-dark-800">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Car size={16}/> Vehicle Details</h3>
          
          {user?.vehicleImage && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-dark-700 relative">
              <img src={user.vehicleImage} alt="Vehicle" className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 to-transparent" />
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-dark-800 pb-4">
              <span className="text-slate-400 font-medium">Vehicle Type</span>
              <span className="font-bold text-white bg-dark-800 px-3 py-1 rounded-lg">{user?.vehicleType || "Not Provided"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dark-800 pb-4">
              <span className="text-slate-400 font-medium">License Plate</span>
              <span className="font-black tracking-widest text-primary-400">{user?.vehicleNumber || "NOT PROVIDED"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium flex items-center gap-2"><Calendar size={16}/> Join Date</span>
              <span className="font-bold text-white">{joinDate}</span>
            </div>
          </div>
        </GlassCard>

        {/* Settings Menu */}
        <div className="space-y-3">
          <GlassCard className="p-4 flex items-center justify-between hover:bg-dark-800 transition-colors cursor-pointer border border-dark-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><CreditCard size={18}/></div>
              <span className="font-bold text-white">Payout Methods</span>
            </div>
          </GlassCard>
          
          <GlassCard className="p-4 flex items-center justify-between hover:bg-dark-800 transition-colors cursor-pointer border border-dark-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400"><Bell size={18}/></div>
              <span className="font-bold text-white">Notification Preferences</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center justify-between hover:bg-dark-800 transition-colors cursor-pointer border border-dark-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400"><HelpCircle size={18}/></div>
              <span className="font-bold text-white">Help & Support</span>
            </div>
          </GlassCard>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full mt-8 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
          <LogOut size={20} /> Sign Out
        </button>

      </div>
    </div>
  );
}
