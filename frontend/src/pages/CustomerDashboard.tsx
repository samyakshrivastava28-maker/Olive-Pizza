import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Order } from "../types/models";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuthStore } from "../lib/store";
import { Link, useNavigate, useSearchParams } from "react-router";
import { 
  User, 
  MapPin, 
  History, 
  Award, 
  HelpCircle, 
  Settings, 
  LogOut, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Navigation, 
  Flame, 
  ExternalLink, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Package
} from "lucide-react";
import OrderHistory from "../components/customer/dashboard/OrderHistory";
import LoyaltyRewards from "../components/customer/dashboard/LoyaltyRewards";
import AddressBook from "../components/customer/AddressBook";
import PhoneUpdateModal from "../components/customer/dashboard/PhoneUpdateModal";
import PrivacyCenter from "../components/customer/privacy/PrivacyCenter";
import SEO from "../components/SEO";
import { fetchApi } from "../lib/config";
import toast from "react-hot-toast";

const TRACKABLE_STATUSES = new Set([
  "accepted",
  "preparing",
  "ready",
  "partner_assigned",
  "picked_up",
  "out_for_delivery",
]);

const SUPPORT_FAQS = [
  {
    q: "How does live GPS order tracking work?",
    a: "Every active order features real-time tracking. Once your pizza leaves our wood-fired oven and is picked up by the delivery rider, you can track their route live on OpenStreetMap with real-time telemetry."
  },
  {
    q: "What is the delivery coverage in Rajnandgaon?",
    a: "We deliver piping hot, hand-stretched pizzas throughout Rajnandgaon within a 5 km radius from our central kitchen hub near Reliance Trends, Gokul Nagar."
  },
  {
    q: "How do loyalty reward points work?",
    a: "You earn 1 reward point for every ₹10 spent. Points automatically accumulate, unlocking higher tiers (Bronze, Silver, Gold, Platinum) and can be redeemed at checkout (₹0.50 per point)."
  },
  {
    q: "What payment methods are supported?",
    a: "We accept online payments (UPI, Google Pay, PhonePe, Paytm, Cards, Net Banking) as well as Cash on Delivery (COD)."
  },
  {
    q: "Can I modify or cancel an order?",
    a: "Because our pizzas are prepared fresh immediately upon confirmation, orders can only be cancelled during the initial accepted phase directly from the live tracking page."
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
  const { user, setUser, logout } = useAuthStore();

  // Profile Edit State
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Fetch customer orders and loyalty data
  useEffect(() => {
    let isMounted = true;

    const fetchCustomerData = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const uid = auth.currentUser.uid;
        const phone = user?.phone;

        // 1. Query orders by customer UID or phone
        const ordersRef = collection(db, "orders");
        let qOrders = query(ordersRef, where("customerId", "==", uid));
        let snap = await getDocs(qOrders);

        if (snap.empty && phone) {
          qOrders = query(ordersRef, where("customerPhone", "==", phone));
          snap = await getDocs(qOrders);
        }

        const loadedOrders: Order[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        // Sort descending by date
        loadedOrders.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        if (isMounted) {
          setOrders(loadedOrders);
          sessionStorage.setItem("customer_orders", JSON.stringify(loadedOrders));
        }

        // 2. Fetch loyalty data
        try {
          const token = await auth.currentUser.getIdToken();
          const loyRes = await fetchApi('/api/user/loyalty', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (loyRes.ok) {
            const loyJson = await loyRes.json();
            if (isMounted && loyJson.success) {
              setLoyaltyData(loyJson);
            }
          }
        } catch {
          // Non-critical loyalty error
        }
      } catch (err) {
        console.warn("[CustomerProfile] Failed fetching user orders:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCustomerData();

    return () => {
      isMounted = false;
    };
  }, [user?.phone]);

  // Active in-flight order (if any)
  const activeOrder = useMemo(() => {
    return orders.find(o => TRACKABLE_STATUSES.has(o.status));
  }, [orders]);

  // Save profile name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !auth.currentUser) return;

    setSavingProfile(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: nameInput.trim(),
        updatedAt: new Date().toISOString()
      });

      if (user) {
        setUser({ ...user, name: nameInput.trim() }, 'customer');
      }
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile name.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      logout();
      toast.success("Signed out safely.");
      navigate("/");
    } catch {
      logout();
      navigate("/");
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[#FAF7F2] text-slate-900 pt-20 md:pt-24 pb-16 selection:bg-rose-500 selection:text-white">
      <SEO title="My Profile | Olive Pizza" />

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 -translate-x-1/2 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-red-200/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
        
        {/* ── 1. Profile Header Identity Card ──────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-[0_15px_40px_rgba(249,115,22,0.06)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-orange-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-red-500/20 shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{(user?.name || "Customer").charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {user?.name || "Customer"}
                </h1>

                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                  {user?.email && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{user.email}</span>
                      {user.emailVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    </span>
                  )}

                  {user?.phone ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{user.phone}</span>
                      {user.phoneVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    </span>
                  ) : (
                    <button
                      onClick={() => setIsPhoneModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Add Phone</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Loyalty Pill */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                <Award className="w-3.5 h-3.5" />
                <span>{loyaltyData?.tier || "Bronze"} Tier</span>
              </span>
              <p className="text-sm font-bold text-slate-700 mt-1">
                <span className="text-red-600 font-black text-lg">{loyaltyData?.points || 0}</span> Points
                <span className="text-xs text-slate-400 ml-1">(₹{((loyaltyData?.points || 0) * 0.5).toFixed(0)} value)</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Active Order Radar Alert (if any order is in-flight) ───────── */}
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white shadow-xl shadow-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 block">
                  Active Live Order #{activeOrder.dailyOrderNumber || activeOrder.id?.slice(-4).toUpperCase() || 'LIVE'}
                </span>
                <p className="text-base font-black text-white capitalize mt-0.5">
                  {activeOrder.status.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-rose-100">
                  {activeOrder.items?.length || 1} items • ₹{activeOrder.totalAmount}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/order-tracking/${activeOrder.id || ''}`)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-red-600 hover:bg-orange-50 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-red-600" />
              <span>Track Live GPS Route</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── 3. Segmented Navigation Tabs ─────────────────────────────────── */}
        <div className="flex bg-orange-100/70 p-1.5 rounded-2xl border border-orange-200/60 overflow-x-auto scrollbar-none">
          {[
            { id: "profile", label: "Profile & Addresses", icon: User },
            { id: "orders", label: "My Orders", icon: History },
            { id: "loyalty", label: "Rewards & Points", icon: Award },
            { id: "privacy", label: "Privacy & Data", icon: ShieldCheck },
            { id: "support", label: "Help & Support", icon: HelpCircle },
            { id: "account", label: "Account Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-red-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 4. Tab Content Modules ───────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* TAB: PROFILE & ADDRESSES */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Edit Details Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-4">
                  Personal Information
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl text-slate-900 text-sm font-medium focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || "Not linked"}
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Mobile Number
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="tel"
                          disabled
                          value={user?.phone || "Not linked"}
                          className="w-full px-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => setIsPhoneModalOpen(true)}
                          className="absolute right-2 px-3 py-1.5 bg-white border border-slate-200 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile || !nameInput.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>

              {/* Saved Delivery Addresses */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm">
                <AddressBook />
              </div>
            </motion.div>
          )}

          {/* TAB: ORDERS */}
          {activeTab === "orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm"
            >
              <OrderHistory orders={orders} />
            </motion.div>
          )}

          {/* TAB: LOYALTY */}
          {activeTab === "loyalty" && (
            <motion.div
              key="loyalty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm"
            >
              <LoyaltyRewards loyaltyData={loyaltyData} />
            </motion.div>
          )}

          {/* TAB: HELP & SUPPORT */}
          {activeTab === "support" && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Quick Contact Capsules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="https://wa.me/918305500767?text=Hi%20Olive%20Pizza%20Team,%20I%20need%20assistance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-3xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 group-hover:text-emerald-800">
                      WhatsApp Live Support
                    </h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Chat directly with our support team
                    </p>
                  </div>
                </a>

                <a
                  href="tel:+918305500767"
                  className="p-5 rounded-3xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200 transition-all flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-orange-950 group-hover:text-orange-800">
                      Call Kitchen Hotline
                    </h4>
                    <p className="text-xs text-orange-700 mt-0.5">
                      +91 83055 00767 (11 AM – 11 PM)
                    </p>
                  </div>
                </a>
              </div>

              {/* FAQs Accordion */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-4">
                  Frequently Asked Questions
                </h3>

                <div className="space-y-3">
                  {SUPPORT_FAQS.map((faq, idx) => {
                    const isOpen = faqOpenIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/80 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                          className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isOpen ? "rotate-180 text-red-600" : ""
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed bg-slate-50/50 border-t border-slate-100">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: PRIVACY & DATA RIGHTS */}
          {activeTab === "privacy" && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <PrivacyCenter />
            </motion.div>
          )}

          {/* TAB: ACCOUNT & SECURITY */}
          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm space-y-6"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Account Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage session credentials and security
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">
                      Sign Out
                    </h5>
                    <p className="text-xs text-slate-500">
                      Safely log out of your session on this device
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">
                      Delete Account Data
                    </h5>
                    <p className="text-xs text-slate-500">
                      Permanently request removal of your account
                    </p>
                  </div>
                  <Link
                    to="/delete-account"
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Phone Update Modal */}
      {isPhoneModalOpen && (
        <PhoneUpdateModal
          isOpen={isPhoneModalOpen}
          onClose={() => setIsPhoneModalOpen(false)}
          currentPhone={user?.phone || ""}
          onSuccess={(newPhone: string) => {
            if (user) {
              setUser({ ...user, phone: newPhone, phoneVerified: true }, 'customer');
            }
          }}
        />
      )}
    </PageTransition>
  );
}
