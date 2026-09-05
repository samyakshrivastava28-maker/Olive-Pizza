import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Order } from "../types/models";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuthStore, useCartStore } from "../lib/store";
import { Link, useNavigate } from "react-router";
import { 
  ShoppingCart, 
  Home, 
  History, 
  Heart, 
  Award, 
  Wallet as WalletIcon, 
  Settings, 
  LogOut, 
  MapPin, 
  Laptop, 
  ChevronRight, 
  Sparkles, 
  User, 
  ShieldCheck,
  ArrowLeft
} from "lucide-react";
import DashboardHome from "../components/customer/dashboard/DashboardHome";
import OrderHistory from "../components/customer/dashboard/OrderHistory";
import Wishlist from "../components/customer/dashboard/Wishlist";
import LoyaltyRewards from "../components/customer/dashboard/LoyaltyRewards";
import Wallet from "../components/customer/dashboard/Wallet";
import AccountSettings from "../components/customer/dashboard/AccountSettings";
import AddressBook from "../components/customer/AddressBook";
import MyDevices from "../components/customer/dashboard/MyDevices";
import FloatingLines from "../components/ui/FloatingLines";
import SEO from "../components/SEO";

function DashboardSkeleton() {
  return (
    <div className="w-full relative z-10 max-w-7xl mx-auto p-4 md:p-8 pt-8 animate-pulse space-y-6">
      <div className="h-24 w-full bg-dark-800/80 rounded-3xl border border-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-dark-800/80 rounded-3xl border border-white/5" />
        <div className="h-72 bg-dark-800/80 rounded-3xl border border-white/5" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-dark-800/80 rounded-2xl border border-white/5" />
        ))}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = sessionStorage.getItem("customer_orders");
    return cached ? JSON.parse(cached) : [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();

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

  const stats = useMemo(() => {
    let spent = 0;
    const itemCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status !== "cancelled") spent += o.totalAmount;
      o.items?.forEach((i) => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
      });
    });

    let favorite = "N/A";
    let max = 0;
    const favoriteItems: any[] = [];
    for (const [name, count] of Object.entries(itemCounts)) {
      if (count > max) {
        max = count;
        favorite = name;
      }
      favoriteItems.push({ name, count });
    }

    favoriteItems.sort((a, b) => b.count - a.count);
    const recommended = favoriteItems.slice(0, 3).map(item => {
      for (const order of orders) {
        const found = order.items?.find((i: any) => i.name === item.name);
        if (found) return found;
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      totalOrders: orders.filter((o) => o.status !== "cancelled").length,
      activeOrdersCount: orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
      totalSpent: spent,
      rewardPoints: Math.floor(spent * 0.1),
      favoritePizza: favorite,
      recommended
    };
  }, [orders]);

  if (isLoading && orders.length === 0) {
    return (
      <PageTransition className="w-full relative min-h-[100dvh] text-slate-200 bg-dark-950">
        <DashboardSkeleton />
      </PageTransition>
    );
  }

  const TABS = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "history", label: "Orders", icon: History, badge: stats.activeOrdersCount > 0 ? stats.activeOrdersCount : undefined },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "locations", label: "My Locations", icon: MapPin },
    { id: "rewards", label: "Rewards", icon: Award, badgeText: `${stats.rewardPoints} pts` },
    { id: "wallet", label: "Wallet", icon: WalletIcon },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "devices", label: "My Devices", icon: Laptop },
  ];

  // Loyalty Tier calculation
  const points = stats.rewardPoints;
  const loyaltyTier = points >= 1000 ? "Platinum" : points >= 500 ? "Gold" : points >= 200 ? "Silver" : "Bronze";
  const tierColor = 
    loyaltyTier === "Platinum" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" :
    loyaltyTier === "Gold" ? "text-yellow-300 border-yellow-500/40 bg-yellow-500/10" :
    loyaltyTier === "Silver" ? "text-slate-300 border-slate-400/40 bg-slate-500/10" :
    "text-amber-400 border-amber-500/40 bg-amber-500/10";

  return (
    <>
      <SEO title="Account Dashboard | Olive Pizza" noIndex={true} />
      <PageTransition className="w-full relative min-h-[100dvh] text-slate-200 bg-dark-950 overflow-x-hidden pb-32 md:pb-16">
        <FloatingLines />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-4 md:pt-6">
          
          {/* ── Top App Bar & Profile Header ─────────────────────────────── */}
          <div className="mb-6">
            {/* Top Navigation Strip */}
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl border border-red-500/20 transition-all"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>

            {/* Profile Identity Bar */}
            <div className="rounded-3xl p-5 md:p-6 bg-gradient-to-r from-dark-900/90 via-dark-900/70 to-dark-950/90 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with Status Halo */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 border-primary-500/40 bg-dark-950 flex items-center justify-center shadow-lg shadow-primary-500/15">
                    {user?.photoURL || user?.photoUrl ? (
                      <img 
                        src={user.photoURL || user.photoUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-2xl select-none">🍕</span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-dark-900 shadow" title="Online" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-xl font-black text-white truncate">
                      {user?.name || user?.email?.split("@")[0] || "Pizza Club Member"}
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {user?.email || "Signed in with Phone"}
                  </p>
                </div>
              </div>

              {/* Badges & Loyalty Summary */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${tierColor}`}>
                  <Award size={15} /> {loyaltyTier} Club
                </div>
                <div className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-black flex items-center gap-1.5">
                  <Sparkles size={14} /> {stats.rewardPoints} Pts
                </div>
              </div>
            </div>
          </div>

          {/* ── Layout: Sidebar on Desktop + Horizontal Tabs on Mobile ──── */}
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
            
            {/* Navigation Tabs (Mobile Segmented Slider + Desktop Sidebar) */}
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
                  Menu & Preferences
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
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
                >
                  <LogOut size={17} />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow min-w-0 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ willChange: "transform, opacity" }}
                >
                  {activeTab === "home" && <DashboardHome orders={orders} stats={stats} setActiveTab={setActiveTab} />}
                  {activeTab === "history" && <OrderHistory orders={orders} />}
                  {activeTab === "wishlist" && <Wishlist />}
                  {activeTab === "locations" && <AddressBook />}
                  {activeTab === "rewards" && <LoyaltyRewards stats={stats} />}
                  {activeTab === "wallet" && <Wallet />}
                  {activeTab === "settings" && <AccountSettings />}
                  {activeTab === "devices" && <MyDevices />}
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
      </PageTransition>
    </>
  );
}

