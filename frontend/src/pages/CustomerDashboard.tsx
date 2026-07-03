import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Order } from "../types/models";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuthStore, useCartStore } from "../lib/store";
import { Link, useNavigate } from "react-router";
import { ShoppingCart, Home, History, Heart, Award, Wallet as WalletIcon, Settings, LogOut, MapPin } from "lucide-react";
import DashboardHome from "../components/customer/dashboard/DashboardHome";
import OrderHistory from "../components/customer/dashboard/OrderHistory";
import Wishlist from "../components/customer/dashboard/Wishlist";
import LoyaltyRewards from "../components/customer/dashboard/LoyaltyRewards";
import Wallet from "../components/customer/dashboard/Wallet";
import AccountSettings from "../components/customer/dashboard/AccountSettings";
import AddressBook from "../components/customer/AddressBook";
import FloatingLines from "../components/ui/FloatingLines";

function DashboardSkeleton() {
  return (
    <div className="w-full relative z-10 max-w-7xl mx-auto p-4 md:p-8 pt-8 animate-pulse">
      <div className="h-8 w-1/4 bg-dark-800 rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 h-64 bg-dark-800 rounded-3xl" />
        <div className="h-64 bg-dark-800 rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-dark-800 rounded-2xl" />
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
      o.items.forEach((i) => {
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
        const found = order.items.find((i: any) => i.name === item.name);
        if (found) return found;
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      totalOrders: orders.filter((o) => o.status !== "cancelled").length,
      totalSpent: spent,
      rewardPoints: Math.floor(spent * 0.1),
      favoritePizza: favorite,
      recommended
    };
  }, [orders]);

  if (isLoading && orders.length === 0) {
    return (
      <PageTransition className="w-full relative min-h-[100dvh] text-slate-200">
        <DashboardSkeleton />
      </PageTransition>
    );
  }

  const TABS = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "history", label: "Orders", icon: History },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "locations", label: "My Locations", icon: MapPin },
    { id: "rewards", label: "Rewards", icon: Award },
    { id: "wallet", label: "Wallet", icon: WalletIcon },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <PageTransition className="w-full relative min-h-[100dvh] text-slate-200 bg-dark-950 overflow-hidden">
      <FloatingLines />
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 pt-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar / Top Nav */}
        <div className="w-full md:w-64 flex-shrink-0">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 font-bold mb-8 transition-colors">
            <Home size={18} /> Back to Homepage
          </Link>
          <div className="flex md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-4 md:pb-0 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-primary-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-white" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap text-red-400 hover:bg-red-500/10 hover:text-red-300 md:mt-4"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ willChange: 'transform, opacity' }}
            >
              {activeTab === "home" && <DashboardHome orders={orders} stats={stats} setActiveTab={setActiveTab} />}
              {activeTab === "history" && <OrderHistory orders={orders} />}
              {activeTab === "wishlist" && <Wishlist />}
              {activeTab === "locations" && <AddressBook />}
              {activeTab === "rewards" && <LoyaltyRewards stats={stats} />}
              {activeTab === "wallet" && <Wallet />}
              {activeTab === "settings" && <AccountSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-24 md:bottom-8 right-6 z-50 bg-[#f97316] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(249,115,22,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#1E293B]">
            {cartItemCount}
          </span>
        </Link>
      )}
    </PageTransition>
  );
}
