import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Order } from "../../../types/models";
import { useAuthStore, useCartStore } from "../../../lib/store";
import { useCartAnimation } from "../../ui/CartAnimationProvider";
import { TiltCard } from "../../ui/TiltCard";
import { GlassButton } from "../../ui/glass/GlassSystem";
import { 
  Package, 
  MapPin, 
  MessageSquare, 
  Award, 
  Heart, 
  Navigation, 
  XCircle, 
  Sparkles, 
  Clock, 
  Flame, 
  ArrowRight, 
  IndianRupee,
  ShoppingBag,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";

interface Props {
  orders: Order[];
  stats: any;
  setActiveTab: (tab: string) => void;
}

export default function DashboardHome({ orders, stats, setActiveTab }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { triggerAnimation } = useCartAnimation();

  // Active in-flight order (cooking or on the way)
  const activeOrder = orders.find((o) => !["delivered", "cancelled"].includes(o.status));
  const latestOrder = orders[0];
  const isLatestCancelled = latestOrder && latestOrder.status === "cancelled";
  const cancelReason = isLatestCancelled
    ? latestOrder.cancellationReason || (latestOrder as any).cancellation_reason || (latestOrder as any).lastRejectionReason || (latestOrder as any).reason
    : null;

  // Dynamic Time-of-Day Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 22) return "Good evening";
    return "Late night cravings?";
  }, []);

  const displayName = user?.name ? user.name.split(" ")[0] : (user?.email ? user.email.split("@")[0] : "Friend");

  // Loyalty Tier & Progress Calculations
  const rewardPoints = stats?.rewardPoints || 0;
  let tier = "Bronze Member";
  let tierColor = "text-amber-400 bg-amber-500/20 border-amber-500/30";
  let nextTier = "Silver";
  let targetPoints = 200;
  let progressPercent = Math.min(100, Math.round((rewardPoints / 200) * 100));

  if (rewardPoints >= 1000) {
    tier = "Platinum Member";
    tierColor = "text-emerald-300 bg-emerald-500/20 border-emerald-500/30";
    nextTier = "Max Tier";
    targetPoints = 1000;
    progressPercent = 100;
  } else if (rewardPoints >= 500) {
    tier = "Gold Member";
    tierColor = "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    nextTier = "Platinum";
    targetPoints = 1000;
    progressPercent = Math.min(100, Math.round(((rewardPoints - 500) / 500) * 100));
  } else if (rewardPoints >= 200) {
    tier = "Silver Member";
    tierColor = "text-slate-300 bg-slate-500/20 border-slate-400/30";
    nextTier = "Gold";
    targetPoints = 500;
    progressPercent = Math.min(100, Math.round(((rewardPoints - 200) / 300) * 100));
  }

  // Handle Quick Add to Cart with 5-step animation
  const handleQuickAdd = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const itemImage = item.image || "/logo-transparent.png";
    triggerAnimation(e, itemImage, () => {
      addItem({
        id: item.id || item.menuItemId || Math.random().toString(),
        menuItemId: item.menuItemId || item.id || "unknown",
        name: item.name,
        price: item.price,
        quantity: 1,
        image: itemImage,
        isVegetarian: item.isVegetarian ?? true,
      });
      toast.success(`${item.name} added to cart! 🍕`, {
        style: { background: "#18181b", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
      });
    });
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* ── Active Live Order Tracker Banner ────────────────────────────── */}
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 md:p-6 bg-gradient-to-r from-emerald-950/80 via-dark-900 to-dark-950 border border-emerald-500/40 shadow-xl shadow-emerald-950/40"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Radar Beacon */}
              <div className="relative flex-shrink-0 mt-1">
                <span className="flex h-4 w-4 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Live Active Order
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    #{activeOrder.dailyOrderNumber || activeOrder.id?.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white capitalize">
                  {activeOrder.status === "preparing" 
                    ? "Baking in Wood-Fired Oven 🔥" 
                    : activeOrder.status === "out_for_delivery" 
                    ? "Out for Delivery with Rider 🛵" 
                    : activeOrder.status === "ready" 
                    ? "Hot & Ready for Pickup 🍕" 
                    : "Order Confirmed & Queued"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {activeOrder.items?.length || 1} item(s) • Total: ₹{activeOrder.totalAmount}
                </p>
              </div>
            </div>

            <GlassButton
              variant="primary"
              onClick={() => navigate(`/order-tracking/${activeOrder.id}`)}
              className="w-full md:w-auto text-xs font-black flex items-center justify-center gap-2 !bg-emerald-500 hover:!bg-emerald-400 !text-dark-950 border-none shadow-lg shadow-emerald-500/30 !py-3 !px-5"
            >
              <Navigation size={16} /> Live GPS Tracking <ArrowRight size={14} />
            </GlassButton>
          </div>
        </motion.div>
      )}

      {/* ── Cancelled Order Notice ──────────────────────────────────────── */}
      {isLatestCancelled && !activeOrder && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-xl text-red-400 border border-red-500/30 flex-shrink-0">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Order #{latestOrder.dailyOrderNumber || latestOrder.id?.slice(-6).toUpperCase()} Cancelled
              </p>
              <p className="text-white text-sm font-medium mt-0.5">
                Reason: <span className="font-semibold italic text-slate-200">{cancelReason ? `"${cancelReason}"` : "Cancelled by restaurant."}</span>
              </p>
            </div>
          </div>
          <GlassButton
            variant="secondary"
            onClick={() => navigate(`/order-tracking/${latestOrder.id}`)}
            className="text-xs font-bold whitespace-nowrap !py-2 !px-4"
          >
            View Details
          </GlassButton>
        </div>
      )}

      {/* ── Hero Welcome & AI Assist Strip ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Welcome Card */}
        <TiltCard className="lg:col-span-2 p-6 md:p-8 overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 backdrop-blur-xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Flame size={13} className="text-primary-400" /> Wood-Fired Excellence
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                {greeting}, {displayName}! 👋
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${tierColor}`}>
                  <Award size={14} /> {tier}
                </span>
                <span className="text-slate-300 text-xs font-semibold border border-white/10 bg-dark-900/60 px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-400" /> {rewardPoints} Points
                </span>
              </div>

              {/* Tier Progress Bar */}
              {nextTier !== "Max Tier" && (
                <div className="mb-6 max-w-sm">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-1.5">
                    <span>Progress to <span className="text-amber-400 font-extrabold">{nextTier}</span></span>
                    <span>{targetPoints - rewardPoints} pts left</span>
                  </div>
                  <div className="w-full h-2 bg-dark-950/80 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <GlassButton 
                  variant="primary" 
                  onClick={() => navigate("/menu")} 
                  className="flex items-center gap-2 text-xs font-bold !py-3 !px-5"
                >
                  <ShoppingBag size={16} /> Explore Menu
                </GlassButton>
                {activeOrder ? (
                  <GlassButton 
                    onClick={() => navigate(`/order-tracking/${activeOrder.id}`)} 
                    className="flex items-center gap-2 text-xs font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 !py-3 !px-5"
                  >
                    <Navigation size={16} /> Track Order
                  </GlassButton>
                ) : (
                  <GlassButton 
                    variant="secondary"
                    onClick={() => setActiveTab("history")} 
                    className="flex items-center gap-2 text-xs font-bold !py-3 !px-5"
                  >
                    <Clock size={16} /> Order History
                  </GlassButton>
                )}
              </div>
            </div>

            {/* 3D Floating Avatar / Pizza Emblem */}
            <motion.div
              animate={{ y: [-6, 6, -6], rotateZ: [-3, 3, -3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-32 h-32 md:w-36 md:h-36 drop-shadow-2xl hidden md:flex items-center justify-center flex-shrink-0"
            >
              <div className="absolute inset-0 bg-primary-500/25 blur-3xl rounded-full" />
              {user?.photoURL || user?.photoUrl ? (
                <img 
                  src={user.photoURL || user.photoUrl} 
                  alt={displayName} 
                  className="w-28 h-28 rounded-3xl object-cover border-4 border-white/20 shadow-2xl relative z-10" 
                />
              ) : (
                <span className="text-7xl relative z-10 select-none" style={{ filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.6))" }}>
                  🍕
                </span>
              )}
            </motion.div>
          </div>
        </TiltCard>

        {/* AI Chef Assistant Teaser */}
        <TiltCard className="p-6 md:p-8 flex flex-col justify-between text-center bg-gradient-to-br from-amber-500/15 via-primary-500/10 to-transparent border border-primary-500/30">
          <div>
            <div className="w-14 h-14 bg-gradient-to-tr from-primary-500 to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
              <motion.span 
                animate={{ rotateY: 360 }} 
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }} 
                className="text-2xl"
              >
                ✨
              </motion.span>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Olive Pizza AI Chef</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Get personalized pairings, discover secret menu combos, or craft customized toppings in seconds.
            </p>
          </div>
          <GlassButton
            onClick={() => navigate("/assistant")}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold !py-3"
          >
            <MessageSquare size={16} /> Chat with AI Chef <ChevronRight size={14} />
          </GlassButton>
        </TiltCard>
      </div>

      {/* ── Quick Action Shortcuts (Mobile-First Native Chips) ───────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Wood-Fired Menu", sub: "Explore 40+ Pizzas", icon: ShoppingBag, action: () => navigate("/menu"), color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
          { label: "My Wishlist", sub: "Saved Favorites", icon: Heart, action: () => setActiveTab("wishlist"), color: "text-red-400 bg-red-500/10 border-red-500/20" },
          { label: "Saved Addresses", sub: "Speedy Delivery", icon: MapPin, action: () => setActiveTab("locations"), color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
          { label: "Olive Pizza Club", sub: "Rewards & Vouchers", icon: Award, action: () => setActiveTab("rewards"), color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-dark-900/60 hover:bg-dark-900 border border-white/5 hover:border-white/15 transition-all text-left group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${item.color} group-hover:scale-110 transition-transform`}>
              <item.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{item.label}</p>
              <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Spatial Statistics Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          { 
            label: "Total Orders", 
            value: stats.totalOrders.toString(), 
            icon: Package, 
            color: "text-orange-400", 
            bg: "bg-orange-500/20", 
            border: "border-orange-500/30",
            helper: "Delivered hot & fresh"
          },
          { 
            label: "Total Spent", 
            value: `₹${stats.totalSpent}`, 
            icon: IndianRupee, 
            color: "text-emerald-400", 
            bg: "bg-emerald-500/20", 
            border: "border-emerald-500/30",
            helper: "Across all orders"
          },
          { 
            label: "Reward Coins", 
            value: stats.rewardPoints.toString(), 
            icon: Award, 
            color: "text-yellow-400", 
            bg: "bg-yellow-500/20", 
            border: "border-yellow-500/30",
            helper: "Redeemable at checkout"
          },
          { 
            label: "Favorite Slice", 
            value: stats.favoritePizza, 
            icon: Heart, 
            color: "text-red-400", 
            bg: "bg-red-500/20", 
            border: "border-red-500/30", 
            truncate: true,
            helper: "Most re-ordered"
          },
        ].map((stat, idx) => (
          <TiltCard key={idx} className="p-4 md:p-6 bg-dark-900/50 border border-white/10 hover:border-white/20 transition-all">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center mb-3 md:mb-4`}>
              <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-0.5">{stat.label}</p>
            <p className={`text-xl md:text-2xl font-black text-white ${stat.truncate ? "truncate" : ""}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 hidden sm:block">{stat.helper}</p>
          </TiltCard>
        ))}
      </div>

      {/* ── AI Recommendations / Re-Order Favorites ────────────────────── */}
      {stats.recommended && stats.recommended.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <Heart size={22} className="text-red-500 fill-red-500" /> Favorites & AI Recommendations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Quick 1-tap re-order directly to your cart</p>
            </div>
            <button 
              onClick={() => navigate("/menu")} 
              className="text-xs font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Full Menu <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stats.recommended.map((item: any, idx: number) => (
              <TiltCard key={idx} className="p-4 flex flex-col justify-between bg-dark-900/60 border border-white/10 hover:border-primary-500/40 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-dark-950 border border-white/10">
                    <img 
                      src={item.image || "/logo-transparent.png"} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                    <div className="absolute top-1 left-1 bg-dark-950/80 p-1 rounded border border-white/10">
                      <div className={`w-2 h-2 rounded-full ${item.isVegetarian !== false ? "bg-emerald-400" : "bg-red-500"}`} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-base leading-snug truncate mb-1">{item.name}</h4>
                    <p className="text-primary-400 font-black text-base">₹{item.price}</p>
                    <span className="text-[10px] text-slate-400 font-medium">Frequently Ordered</span>
                  </div>
                </div>

                <GlassButton
                  variant="primary"
                  onClick={(e) => handleQuickAdd(e, item)}
                  className="w-full text-xs font-bold !py-2.5 flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag size={14} /> Add to Cart • ₹{item.price}
                </GlassButton>
              </TiltCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
