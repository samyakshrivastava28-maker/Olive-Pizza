import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { Order } from "../types/models";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuthStore, useCartStore } from "../lib/store";
import { Link, useNavigate, useSearchParams } from "react-router";
import { 
  ShoppingCart, 
  History, 
  Heart, 
  Award, 
  Wallet as WalletIcon, 
  Settings, 
  LogOut, 
  MapPin, 
  Laptop, 
  ChevronRight, 
  ChevronDown,
  Sparkles, 
  User, 
  ShieldCheck,
  ArrowLeft,
  Phone,
  Mail,
  HelpCircle,
  MessageSquare,
  FileText,
  Navigation,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit2,
  Headphones,
  Check,
  RefreshCw,
  Send,
  Lock,
  Camera
} from "lucide-react";
import OrderHistory from "../components/customer/dashboard/OrderHistory";
import Wishlist from "../components/customer/dashboard/Wishlist";
import LoyaltyRewards from "../components/customer/dashboard/LoyaltyRewards";
import Wallet from "../components/customer/dashboard/Wallet";
import AddressBook from "../components/customer/AddressBook";
import MyDevices from "../components/customer/dashboard/MyDevices";
import PhoneUpdateModal from "../components/customer/dashboard/PhoneUpdateModal";
import FloatingLines from "../components/ui/FloatingLines";
import SEO from "../components/SEO";
import { fetchApi } from "../lib/config";
import toast from "react-hot-toast";
import { APP_VERSION, checkVersion, useVersionStore } from "../lib/versionManager";
import { sendEmailVerification } from "firebase/auth";

// ── Skeleton Loader ────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="w-full relative z-10 max-w-7xl mx-auto p-4 md:p-8 pt-8 animate-pulse space-y-6">
      <div className="h-28 w-full bg-dark-800/80 rounded-3xl border border-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="h-72 bg-dark-800/80 rounded-3xl border border-white/5" />
        <div className="lg:col-span-3 h-96 bg-dark-800/80 rounded-3xl border border-white/5" />
      </div>
    </div>
  );
}

// ── FAQ Items for Support ──────────────────────────────────────────────────
const SUPPORT_FAQS = [
  {
    q: "How can I track my active order in real time?",
    a: "Every active order features live GPS tracking. Once your pizza leaves our wood-fired oven and is collected by our delivery partner, you can follow their real-time route right on OpenStreetMap with live OSRM telemetry."
  },
  {
    q: "What is your delivery coverage in Rajnandgaon?",
    a: "We deliver piping hot, hand-stretched wood-fired pizzas throughout Rajnandgaon (within our 5 km coverage radius from our kitchen hub near Reliance Trends, Gokul Nagar)."
  },
  {
    q: "How do loyalty reward points work?",
    a: "You earn 1 reward point for every ₹10 spent. Points automatically accumulate in your account, unlock higher membership tiers (Bronze, Silver, Gold, Platinum), and can be redeemed at checkout (₹0.50 per point)."
  },
  {
    q: "What payment methods are supported?",
    a: "We accept online payments (UPI, Google Pay, PhonePe, Paytm, Credit/Debit Cards, Net Banking) and Cash on Delivery (COD)."
  },
  {
    q: "Can I cancel or modify an order after placing it?",
    a: "Because our wood-fired pizzas are prepared fresh immediately upon confirmation, orders can be cancelled during the initial accepted phase directly from the tracking page before oven baking begins."
  }
];

export default function CustomerDashboard() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';

  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = sessionStorage.getItem("customer_orders");
    return cached ? JSON.parse(cached) : [];
  });
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const navigate = useNavigate();
  const { user, setUser, logout, role } = useAuthStore();
  const { items } = useCartStore();
  const { latestVersion, isUpdateAvailable } = useVersionStore();

  // Profile Edit Form State
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [photoURLInput, setPhotoURLInput] = useState(user?.photoURL || user?.photoUrl || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [sendingEmailVerification, setSendingEmailVerification] = useState(false);

  // Support Form State
  const [supportCategory, setSupportCategory] = useState("Order Issue");
  const [supportOrderId, setSupportOrderId] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  // Account Preferences State
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    whatsappAlerts: true
  });
  const [revokingSessions, setRevokingSessions] = useState(false);

  // Sync inputs with auth user
  useEffect(() => {
    if (user) {
      setNameInput(user.name || "");
      setEmailInput(user.email || "");
      setPhotoURLInput(user.photoURL || user.photoUrl || "");
    }
  }, [user]);

  // Fetch Authoritative Orders from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fetchOrders = async () => {
      try {
        const q = query(collection(db, "orders"), where("userId", "==", auth.currentUser!.uid));
        const snapshot = await getDocs(q);
        const fetchedOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);
        fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(fetchedOrders);
        sessionStorage.setItem("customer_orders", JSON.stringify(fetchedOrders));
      } catch (e) {
        console.error("Failed to fetch orders from Firestore", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Fetch Authoritative Loyalty Points from Backend
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchLoyalty = async () => {
      try {
        const token = await auth.currentUser!.getIdToken();
        const res = await fetchApi('/api/user/loyalty', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLoyaltyData(data);
          }
        }
      } catch (e) {
        console.warn("[CustomerDashboard] Loyalty fetch notice:", e);
      }
    };
    fetchLoyalty();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      logout();
      navigate("/");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Authoritative Stats Calculation
  const stats = useMemo(() => {
    let spent = 0;
    const itemCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status !== "cancelled") spent += o.totalAmount;
      o.items?.forEach((i) => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
      });
    });

    return {
      totalOrders: orders.filter((o) => o.status !== "cancelled").length,
      activeOrdersCount: orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
      totalSpent: spent,
      rewardPoints: loyaltyData?.balance !== undefined ? loyaltyData.balance : Math.floor(spent * 0.1),
    };
  }, [orders, loyaltyData]);

  // Active in-flight order for live banner
  const activeOrder = useMemo(() => {
    return orders.find((o) => !["delivered", "cancelled"].includes(o.status));
  }, [orders]);

  // Authoritative Loyalty Tier
  const points = stats.rewardPoints;
  const rawTier = loyaltyData?.tier || (points >= 1000 ? "Platinum" : points >= 500 ? "Gold" : points >= 200 ? "Silver" : "Bronze");
  const loyaltyTier = rawTier.charAt(0).toUpperCase() + rawTier.slice(1).toLowerCase();
  const tierColor = 
    loyaltyTier === "Platinum" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" :
    loyaltyTier === "Gold" ? "text-yellow-300 border-yellow-500/40 bg-yellow-500/10" :
    loyaltyTier === "Silver" ? "text-slate-300 border-slate-400/40 bg-slate-500/10" :
    "text-amber-400 border-amber-500/40 bg-amber-500/10";

  // Handle Save Personal Details via Backend PUT /api/user/profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSavingProfile(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetchApi('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          photoURL: photoURLInput.trim()
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error || "Failed to update profile");
      }

      if (user) {
        setUser({
          ...user,
          name: nameInput.trim(),
          email: emailInput.trim() || user.email,
          photoURL: photoURLInput.trim() || user.photoURL
        }, role || 'customer');
      }

      toast.success("Profile details updated successfully!");
    } catch (err: any) {
      console.error("Save profile error:", err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Resend Email Verification
  const handleSendEmailVerification = async () => {
    if (!auth.currentUser) return;
    setSendingEmailVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification email.");
    } finally {
      setSendingEmailVerification(false);
    }
  };

  // Handle Revoke All Sessions
  const handleRevokeAllSessions = async () => {
    if (!confirm("Are you sure you want to log out of all other devices? You will stay logged in here.")) return;
    setRevokingSessions(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetchApi('/api/user/revoke-all-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("All other active sessions have been safely terminated.");
      } else {
        throw new Error(data.error || "Failed to revoke sessions.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke sessions.");
    } finally {
      setRevokingSessions(false);
    }
  };

  // Handle Support Form Submission
  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      toast.error("Please describe your issue or query.");
      return;
    }
    setSupportSubmitting(true);
    try {
      await addDoc(collection(db, "customer_feedback"), {
        userId: auth.currentUser?.uid || user?.uid || "anonymous",
        userName: user?.name || "Customer",
        userEmail: user?.email || "",
        userPhone: user?.phone || "",
        category: supportCategory,
        orderId: supportOrderId || null,
        message: supportMessage.trim(),
        status: "open",
        createdAt: new Date().toISOString()
      });
      toast.success("Thank you! Our support team has received your ticket.");
      setSupportMessage("");
      setSupportOrderId("");
    } catch (err) {
      toast.error("Failed to submit ticket. Please reach out via WhatsApp.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <PageTransition className="w-full relative min-h-[100dvh] text-slate-200 bg-dark-950">
        <DashboardSkeleton />
      </PageTransition>
    );
  }

  // 6 Primary Navigation Sections
  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "loyalty", label: "Loyalty", icon: Award, badgeText: `${points} pts` },
    { id: "orders", label: "Orders", icon: History, badge: stats.activeOrdersCount > 0 ? stats.activeOrdersCount : undefined },
    { id: "addresses", label: "Addresses", icon: MapPin },
    { id: "support", label: "Support", icon: Headphones },
    { id: "legal", label: "Legal", icon: ShieldCheck },
    { id: "account", label: "Account", icon: Settings },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "wallet", label: "Wallet", icon: WalletIcon },
  ];

  return (
    <>
      <SEO title="Customer Profile | Olive Pizza" noIndex={true} />
      <PageTransition className="w-full relative min-h-[100dvh] text-slate-200 bg-dark-950 overflow-x-hidden pb-32 md:pb-16">
        <FloatingLines />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-4 md:pt-6">
          
          {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between py-2 mb-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary-400 transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/5"
            >
              <ArrowLeft size={15} /> Back to Homepage
            </Link>
            
            <div className="flex items-center gap-2">
              <Link
                to="/menu"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-3 py-2 rounded-xl border border-primary-500/20 transition-all"
              >
                <Sparkles size={14} /> Wood-Fired Menu
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl border border-red-500/20 transition-all cursor-pointer"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>

          {/* ── Profile Header Section ─────────────────────────────────────── */}
          <div className="mb-6 rounded-3xl p-5 md:p-6 bg-gradient-to-r from-dark-900/90 via-dark-900/70 to-dark-950/90 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar with Status Halo */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary-500/40 bg-dark-950 flex items-center justify-center shadow-lg shadow-primary-500/15">
                  {user?.photoURL || user?.photoUrl ? (
                    <img 
                      src={user.photoURL || user.photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-2xl font-black text-primary-400 select-none">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "🍕"}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-dark-900 shadow" title="Online" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-black text-white truncate">
                    {user?.name || "Add your name"}
                  </h1>
                  {user?.name ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck size={12} /> Verified Member
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="text-[11px] text-primary-400 underline font-bold"
                    >
                      Set name
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-500" />
                    {user?.phone ? (
                      <strong className="text-slate-300 font-mono">{user.phone}</strong>
                    ) : (
                      <span className="text-amber-400">Phone not verified</span>
                    )}
                  </span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="flex items-center gap-1 truncate">
                    <Mail size={12} className="text-slate-500" />
                    {user?.email ? (
                      <span className="truncate">{user.email}</span>
                    ) : (
                      <span className="text-slate-500 italic">Email not added</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges & Authoritative Loyalty Points Summary */}
            <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${tierColor}`}>
                <Award size={15} /> {loyaltyTier} Club
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-black flex items-center gap-1.5">
                <Sparkles size={14} /> {points} Pts
              </div>
            </div>
          </div>

          {/* ── Active Order Live Banner ───────────────────────────────────── */}
          {activeOrder && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 md:p-5 rounded-3xl bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-dark-900 border border-orange-500/40 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0 shadow-lg shadow-orange-500/20">
                  <Truck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                      Active Order in Progress
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">
                      {activeOrder.dailyOrderNumber || `#${activeOrder.id.slice(-6).toUpperCase()}`}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5 capitalize">
                    Status: {activeOrder.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>Track Delivery Live</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── Layout: Sidebar on Desktop + Horizontal Segment on Mobile ── */}
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
            
            {/* Navigation Selector */}
            <div className="w-full lg:w-64 flex-shrink-0">
              {/* Mobile Horizontal Pill Selector */}
              <div className="lg:hidden w-full overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-2 min-w-max pb-2">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap border ${
                          isActive
                            ? "bg-gradient-to-r from-primary-500 to-amber-500 text-white border-transparent shadow-lg shadow-primary-500/25 scale-[1.02]"
                            : "bg-dark-900/70 text-slate-400 hover:text-white border-white/5 hover:border-white/10"
                        }`}
                      >
                        <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-dark-950 text-[10px] font-black flex items-center justify-center">
                            {tab.badge}
                          </span>
                        )}
                        {tab.badgeText && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
                            {tab.badgeText}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Luxury Glassmorphic Sidebar */}
              <div className="hidden lg:flex flex-col gap-1.5 p-3 rounded-3xl bg-dark-900/60 border border-white/10 backdrop-blur-xl shadow-xl w-full sticky top-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2">
                  Customer Profile
                </p>
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all text-left ${
                        isActive
                          ? "bg-gradient-to-r from-primary-500 to-amber-500 text-white shadow-lg shadow-primary-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={17} className={isActive ? "text-white" : "text-slate-400"} />
                        <span>{tab.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {tab.badge && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-dark-950 text-[10px] font-black flex items-center justify-center">
                            {tab.badge}
                          </span>
                        )}
                        {tab.badgeText && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            {tab.badgeText}
                          </span>
                        )}
                        <ChevronRight size={14} className={`opacity-40 ${isActive ? "opacity-100 text-white" : ""}`} />
                      </div>
                    </button>
                  );
                })}

                <div className="w-full h-px bg-white/10 my-2" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left cursor-pointer"
                >
                  <LogOut size={17} />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* ── Main Tab Content ─────────────────────────────────────────── */}
            <div className="flex-grow min-w-0 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* 1. PROFILE TAB */}
                  {activeTab === "profile" && (
                    <div className="space-y-6">
                      {/* Personal Details Form */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <User className="text-primary-400" size={20} /> Personal Details
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Your profile information used for order receipts and delivery coordination.
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-400 block mb-1.5">Full Name</label>
                              <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Your Full Name"
                                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-400 block mb-1.5">Email Address</label>
                              <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1.5">Avatar / Photo URL</label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={photoURLInput}
                                onChange={(e) => setPhotoURLInput(e.target.value)}
                                placeholder="https://example.com/avatar.jpg"
                                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-amber-500 hover:from-primary-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {savingProfile ? "Saving Details..." : "Save Profile Changes"}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Phone & Verification Card */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <Phone className="text-emerald-400" size={20} /> Verified Phone & Sign-In
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Your verified phone number enables instant Truecaller and SMS OTP sign-in.
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-dark-900 border border-white/5 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400">Mobile Number</p>
                              <p className="text-base font-bold text-white font-mono">
                                {user?.phone || "No phone linked"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsPhoneModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit2 size={13} /> Update Phone Number
                          </button>
                        </div>
                      </div>

                      {/* Email Verification Status Card */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <Mail className="text-blue-400" size={20} /> Email Verification
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Used for receiving bills, invoices, and password resets.
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-dark-900 border border-white/5 gap-4">
                          <div>
                            <p className="text-xs font-bold text-slate-400">Registered Email</p>
                            <p className="text-sm font-bold text-white mt-0.5">
                              {user?.email || "No email address on file"}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                              {auth.currentUser?.emailVerified ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Email Verified
                                </span>
                              ) : (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <AlertCircle size={12} /> Pending Verification
                                </span>
                              )}
                            </div>
                          </div>

                          {auth.currentUser && !auth.currentUser.emailVerified && user?.email && (
                            <button
                              type="button"
                              onClick={handleSendEmailVerification}
                              disabled={sendingEmailVerification}
                              className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Send size={13} /> {sendingEmailVerification ? "Sending..." : "Send Verification Email"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. LOYALTY TAB */}
                  {activeTab === "loyalty" && (
                    <LoyaltyRewards stats={stats} loyaltyData={loyaltyData} />
                  )}

                  {/* 3. ORDERS TAB */}
                  {activeTab === "orders" && (
                    <OrderHistory orders={orders} />
                  )}

                  {/* 4. ADDRESSES TAB */}
                  {activeTab === "addresses" && (
                    <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <MapPin className="text-orange-400" size={20} /> Saved Delivery Locations
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Manage your home, office, and preferred addresses for lightning-fast checkout.
                        </p>
                      </div>
                      <AddressBook />
                    </div>
                  )}

                  {/* 5. SUPPORT TAB */}
                  {activeTab === "support" && (
                    <div className="space-y-6">
                      {/* Direct Contact Channels Card */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <Headphones className="text-primary-400" size={20} /> Contact Olive Pizza
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Need instant assistance with an ongoing order? Our team is live and ready to help.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <a
                            href="https://wa.me/919174145455?text=Hello%20Olive%20Pizza%20Support"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition-all flex flex-col items-center text-center gap-2"
                          >
                            <MessageSquare size={24} />
                            <span className="text-xs font-bold">WhatsApp Support</span>
                            <span className="text-[10px] text-slate-400">+91 91741 45455</span>
                          </a>

                          <a
                            href="tel:+919174145455"
                            className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 transition-all flex flex-col items-center text-center gap-2"
                          >
                            <Phone size={24} />
                            <span className="text-xs font-bold">Kitchen Hotline</span>
                            <span className="text-[10px] text-slate-400">Call Directly</span>
                          </a>

                          <a
                            href="mailto:olivepizzarjn@gmail.com"
                            className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 transition-all flex flex-col items-center text-center gap-2"
                          >
                            <Mail size={24} />
                            <span className="text-xs font-bold">Email Support</span>
                            <span className="text-[10px] text-slate-400">olivepizzarjn@gmail.com</span>
                          </a>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex items-start gap-3">
                          <MapPin size={18} className="text-primary-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-slate-400">
                            <strong className="text-white block mb-0.5">Olive Pizza Kitchen Hub</strong>
                            Dongargaon Rd, near Saraswati School, Gokul Nagar, Rajnandgaon, Chhattisgarh 491441
                          </div>
                        </div>
                      </div>

                      {/* Report an Issue Form */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <AlertCircle className="text-amber-400" size={20} /> Report an Issue or Feedback
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Send us feedback about a delivery, taste, packaging, or the app experience.
                        </p>

                        <form onSubmit={handleSubmitSupport} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-400 block mb-1.5">Category</label>
                              <select
                                value={supportCategory}
                                onChange={(e) => setSupportCategory(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500"
                              >
                                <option value="Order Issue">Order Issue</option>
                                <option value="Late Delivery">Late Delivery</option>
                                <option value="Food Quality">Food Quality / Packaging</option>
                                <option value="Missing Items">Missing Items</option>
                                <option value="App or Payment">App / Payment Issue</option>
                                <option value="General Feedback">General Feedback</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-400 block mb-1.5">Related Order (Optional)</label>
                              <select
                                value={supportOrderId}
                                onChange={(e) => setSupportOrderId(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500"
                              >
                                <option value="">Select an order or leave blank</option>
                                {orders.slice(0, 5).map((o) => (
                                  <option key={o.id} value={o.id}>
                                    #{o.dailyOrderNumber || o.id.slice(-6).toUpperCase()} — ₹{o.totalAmount}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1.5">Message / Details</label>
                            <textarea
                              required
                              rows={4}
                              value={supportMessage}
                              onChange={(e) => setSupportMessage(e.target.value)}
                              placeholder="Please describe how we can help you..."
                              className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={supportSubmitting}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-amber-500 hover:from-primary-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {supportSubmitting ? "Submitting..." : "Submit Support Ticket"}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Frequently Asked Questions */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <HelpCircle className="text-blue-400" size={20} /> Frequently Asked Questions
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Quick answers to common questions about our food, ordering, and delivery.
                        </p>

                        <div className="space-y-3">
                          {SUPPORT_FAQS.map((faq, idx) => {
                            const isOpen = activeFaqIndex === idx;
                            return (
                              <div
                                key={idx}
                                className="rounded-2xl bg-dark-900/60 border border-white/5 overflow-hidden transition-all"
                              >
                                <button
                                  type="button"
                                  onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                                  className="w-full p-4 flex items-center justify-between text-left gap-3 text-sm font-bold text-white hover:text-primary-400 transition-colors cursor-pointer"
                                >
                                  <span>{faq.q}</span>
                                  <ChevronDown
                                    size={16}
                                    className={`shrink-0 transition-transform ${isOpen ? "rotate-180 text-primary-400" : "text-slate-500"}`}
                                  />
                                </button>
                                {isOpen && (
                                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                                    {faq.a}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. LEGAL TAB */}
                  {activeTab === "legal" && (
                    <div className="space-y-6">
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <ShieldCheck className="text-primary-400" size={20} /> Legal Policies & Terms
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Transparency is core to our kitchen. Review our policies regarding orders, refunds, cancellations, and privacy.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            {
                              title: "Terms of Service",
                              desc: "Read our general customer terms, service conditions, and platform rules.",
                              href: "/terms",
                              icon: FileText
                            },
                            {
                              title: "Privacy Policy",
                              desc: "Learn how we protect your personal information, phone number, and location data.",
                              href: "/privacy",
                              icon: Lock
                            },
                            {
                              title: "Refund Policy",
                              desc: "Guidelines on order refunds, failed payments, and quality resolution.",
                              href: "/refund-policy",
                              icon: ShieldCheck
                            },
                            {
                              title: "Cancellation Policy",
                              desc: "Detailed rules regarding order cancellation timing and kitchen preparation windows.",
                              href: "/cancellation-policy",
                              icon: AlertCircle
                            },
                            {
                              title: "Delivery Policy",
                              desc: "Coverage radius, estimated delivery windows, and rider safety guidelines.",
                              href: "/delivery-policy",
                              icon: Truck
                            },
                            {
                              title: "Cookie Policy",
                              desc: "Details on session cookies, security tokens, and local cache management.",
                              href: "/cookie-policy",
                              icon: HelpCircle
                            },
                          ].map((item, idx) => (
                            <Link
                              key={idx}
                              to={item.href}
                              className="p-5 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/40 hover:bg-dark-800 transition-all flex flex-col justify-between gap-3 group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 group-hover:scale-105 transition-transform">
                                  <item.icon size={18} />
                                </div>
                                <ExternalLink size={14} className="text-slate-500 group-hover:text-primary-400 transition-colors" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. ACCOUNT TAB */}
                  {activeTab === "account" && (
                    <div className="space-y-6">
                      {/* Notifications Preferences */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                          <Settings className="text-primary-400" size={20} /> Notification Preferences
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                          Control which updates you receive regarding order status and special offers.
                        </p>

                        <div className="space-y-4">
                          {[
                            {
                              id: "orderUpdates",
                              title: "Live Order Status Alerts",
                              desc: "Push notifications and alerts when your pizza is baking, packed, or out for delivery."
                            },
                            {
                              id: "whatsappAlerts",
                              title: "WhatsApp Order Updates",
                              desc: "Receive real-time tracking links and bill receipts directly on WhatsApp."
                            },
                            {
                              id: "promotions",
                              title: "Exclusive Member Offers",
                              desc: "Special promotional discounts, festive menu drops, and secret coupon codes."
                            }
                          ].map((pref) => {
                            const isChecked = (notifications as any)[pref.id];
                            return (
                              <div
                                key={pref.id}
                                className="flex items-center justify-between p-4 rounded-2xl bg-dark-900 border border-white/5 gap-4"
                              >
                                <div>
                                  <h4 className="text-sm font-bold text-white">{pref.title}</h4>
                                  <p className="text-xs text-slate-400 mt-0.5">{pref.desc}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const updated = { ...notifications, [pref.id]: e.target.checked };
                                    setNotifications(updated);
                                    if (auth.currentUser) {
                                      updateDoc(doc(db, "users", auth.currentUser.uid), {
                                        notifications: updated
                                      }).catch(() => {});
                                    }
                                    toast.success("Notification setting saved.");
                                  }}
                                  className="w-5 h-5 accent-primary-500 rounded cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Connected Devices */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <Laptop className="text-blue-400" size={20} /> Active Sessions & Devices
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Review devices currently logged into your Olive Pizza account.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRevokeAllSessions}
                            disabled={revokingSessions}
                            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <LogOut size={13} /> {revokingSessions ? "Revoking..." : "Revoke All Other Sessions"}
                          </button>
                        </div>
                        <MyDevices />
                      </div>

                      {/* App Version & Updates */}
                      <div className="rounded-3xl bg-[#12151E] border border-white/10 p-6 md:p-8 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="text-base font-bold text-white">App Version</h3>
                            <p className="text-white font-mono font-bold text-xs mt-1">v{APP_VERSION}</p>
                            {isUpdateAvailable && latestVersion && (
                              <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                                Update v{latestVersion} available!
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => checkVersion()}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-white/10 cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" /> Check For Updates
                          </button>
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div className="rounded-3xl bg-red-950/20 border border-red-500/30 p-6 md:p-8 shadow-xl">
                        <h3 className="text-base font-bold text-red-400 flex items-center gap-2 mb-1">
                          <AlertCircle size={18} /> Danger Zone
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                          Permanently delete your Olive Pizza profile, saved addresses, and loyalty points.
                        </p>
                        <Link
                          to="/delete-account"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
                        >
                          <Trash2 size={14} /> Request Account Deletion
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* 8. WISHLIST TAB */}
                  {activeTab === "wishlist" && <Wishlist />}

                  {/* 9. WALLET TAB */}
                  {activeTab === "wallet" && <Wallet />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Floating Cart Button (Safely Positioned) */}
        {cartItemCount > 0 && (
          <Link
            to="/cart"
            className="fixed bottom-24 md:bottom-8 right-6 z-50 bg-[#FF6B00] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(255,107,0,0.45)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
          >
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-dark-900">
              {cartItemCount}
            </span>
          </Link>
        )}

        {/* Phone Update Modal */}
        <PhoneUpdateModal
          isOpen={isPhoneModalOpen}
          onClose={() => setIsPhoneModalOpen(false)}
          currentPhone={user?.phone || ""}
          onSuccess={(newPhone) => {
            setIsPhoneModalOpen(false);
            if (user) {
              setUser({ ...user, phone: newPhone, phoneVerified: true, phoneSetupCompleted: true }, role || 'customer');
            }
            toast.success("Phone updated and verified! ✓");
          }}
        />
      </PageTransition>
    </>
  );
}
