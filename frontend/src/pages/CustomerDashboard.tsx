import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Order } from "../types/models";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import PageTransition from "../components/PageTransition";
import CustomerProfile from "../components/customer/CustomerProfile";
import PizzaLoader from "../components/ui/PizzaLoader";
import {
  Award,
  Clock,
  DollarSign,
  Heart,
  Package,
  RotateCcw,
  MessageSquare,
  ShoppingCart,
  Tag,
  Gift,
  Settings,
  MapPin,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useCartStore, useAuthStore } from "../lib/store";
import { PremiumBackground } from "../components/ui/glass/PremiumBackground";
import { GlassCard, GlassButton } from "../components/ui/glass/GlassSystem";
import { toast } from "react-hot-toast";

// 3D Card Component
function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    ["7.5deg", "-7.5deg"],
  );
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    ["-7.5deg", "7.5deg"],
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative rounded-[24px] bg-white/5 dark:bg-white/[0.08] backdrop-blur-[20px] border border-white/10 dark:border-white/[0.15] shadow-2xl transition-shadow hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] ${className}`}
    >
      <div style={{ transform: "translateZ(30px)" }}>{children}</div>

      {/* Glossy reflection layer */}
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none"
        style={{ transform: "translateZ(40px)" }}
      />
    </motion.div>
  );
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { items } = useCartStore();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", auth.currentUser!.uid),
        );
        const snapshot = await getDocs(q);
        const fetchedOrders = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as any,
        );
        fetchedOrders.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setOrders(fetchedOrders);
      } catch (e) {
        console.error("Failed to fetch orders from Firestore", e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");

  // Stats Calculations
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
      // Find full item details from past orders
      for (const order of orders) {
        const found = order.items.find((i: any) => i.name === item.name);
        if (found) return found;
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      totalOrders: orders.filter((o) => o.status !== "cancelled").length,
      totalSpent: spent,
      rewardPoints: Math.floor(spent * 0.1), // 10 points per 100 spent
      favoritePizza: favorite,
      recommended
    };
  }, [orders]);

  if (loading) return <PizzaLoader message="Loading your dashboard..." />;

  // Check for active orders (for quick action button)
  const activeOrder = orders.find(
    (o) => !["delivered", "cancelled", "pending"].includes(o.status),
  );

  const handleReorder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const { addItem } = useCartStore.getState();
    order.items.forEach(item => {
      addItem({
        id: item.id || Math.random().toString(),
        menuItemId: item.menuItemId || item.id || 'unknown',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      });
    });
    toast.success("Items added to cart! Redirecting...");
    setTimeout(() => navigate('/cart'), 1000);
  };

  return (
    <PageTransition className="w-full relative min-h-[100dvh] text-slate-200">
      <PremiumBackground />
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 pt-8">
        {/* Top Navigation/Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-md">
            {activeTab === "orders" ? `Welcome back, ${user?.name || "Customer"}` : "Your Profile"}
          </h1>
          <div className="flex bg-white/5 backdrop-blur-[20px] p-1 rounded-[24px] border border-white/10 shadow-lg">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "orders" ? "bg-primary-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "profile" ? "bg-primary-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-white" : "text-slate-400 hover:text-white"}`}
            >
              Profile
            </button>
          </div>
        </div>

        {activeTab === "orders" ? (
          <div className="flex flex-col gap-8">
            {/* 3D Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Welcome Card */}
              <TiltCard className="lg:col-span-2 p-8 overflow-hidden bg-gradient-to-br from-white/10 to-transparent">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Hungry again,{" "}
                      {user?.name?.split(" ")[0] || "Friend"}
                      ?
                    </h2>
                    <p className="text-white/60 mb-6 max-w-md">
                      You have <span className="text-yellow-400 font-bold text-lg">{stats.rewardPoints} Pizza Points</span> available.
                      Earn 10 points on every ₹100 spent! Redeem for Free Dips, Garlic Bread, or Pizza!
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <GlassButton
                        variant="primary"
                        onClick={() => navigate("/menu")}
                        className="flex items-center gap-2"
                      >
                        <Package size={18} /> Order Now
                      </GlassButton>
                      {activeOrder && (
                        <GlassButton
                          onClick={() =>
                            navigate(`/order-tracking/${activeOrder.id}`)
                          }
                          className="flex items-center gap-2"
                        >
                          <MapPin size={18} /> Track Active Order
                        </GlassButton>
                      )}
                    </div>
                  </div>

                  {/* Floating 3D Pizza */}
                  <motion.div
                    animate={{ y: [-10, 10, -10], rotateZ: [-5, 5, -5] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative w-48 h-48 drop-shadow-2xl hidden sm:block"
                  >
                    <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
                    <span
                      className="text-9xl absolute inset-0 flex items-center justify-center"
                      style={{
                        filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))",
                      }}
                    >
                      🍕
                    </span>
                  </motion.div>
                </div>
              </TiltCard>

              {/* Quick Actions Card */}
              <TiltCard className="p-8 flex flex-col justify-center items-center text-center bg-gradient-to-br from-accent-500/10 to-transparent">
                <div className="w-16 h-16 bg-accent-500/20 rounded-full flex items-center justify-center mb-4 border border-accent-500/30">
                  <motion.span
                    animate={{ rotateY: 360 }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="text-3xl"
                  >
                    ✨
                  </motion.span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Need Recommendations?
                </h3>
                <p className="text-sm text-white/60 mb-6">
                  Ask our AI assistant to build the perfect pizza based on your
                  past favorites.
                </p>
                <GlassButton
                  onClick={() => {
                    const { useAIStore } = require("../lib/aiStore");
                    useAIStore.getState().setIsOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} /> Open Assistant
                </GlassButton>
              </TiltCard>
            </div>

            {/* 3D Statistics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                {
                  label: "Total Orders",
                  value: stats.totalOrders.toString(),
                  icon: Package,
                  color: "text-orange-400",
                  bg: "bg-orange-500/20",
                  border: "border-orange-500/30",
                },
                {
                  label: "Total Spent",
                  value: `₹${stats.totalSpent}`,
                  icon: DollarSign,
                  color: "text-green-400",
                  bg: "bg-green-500/20",
                  border: "border-green-500/30",
                },
                {
                  label: "Pizza Points",
                  value: stats.rewardPoints.toString(),
                  icon: Award,
                  color: "text-yellow-400",
                  bg: "bg-yellow-500/20",
                  border: "border-yellow-500/30",
                },
                {
                  label: "Favorite Pizza",
                  value: stats.favoritePizza,
                  icon: Heart,
                  color: "text-red-400",
                  bg: "bg-red-500/20",
                  border: "border-red-500/30",
                  truncate: true,
                },
              ].map((stat, idx) => (
                <TiltCard key={idx} className="p-6">
                  <div
                    className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center mb-4`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <p className="text-sm text-slate-400 font-medium mb-1">
                    {stat.label}
                  </p>
                  <p
                    className={`text-2xl font-black text-white ${stat.truncate ? "truncate" : ""}`}
                  >
                    {stat.value}
                  </p>
                </TiltCard>
              ))}
            </div>

            {/* Recommended For You Section */}
            {stats.recommended.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                  <Heart size={24} className="text-red-500" /> Recommended For You
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.recommended.map((item, idx) => (
                    <TiltCard key={idx} className="p-4 flex flex-col justify-between">
                      <div className="flex items-center gap-4 mb-4">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                        )}
                        <div>
                          <h4 className="font-bold text-white text-lg">{item.name}</h4>
                          <p className="text-primary-400 font-bold">₹{item.price}</p>
                        </div>
                      </div>
                      <GlassButton
                        variant="primary"
                        onClick={() => {
                          useCartStore.getState().addItem({
                            id: item.id || Math.random().toString(),
                            menuItemId: item.menuItemId || item.id || 'unknown',
                            name: item.name,
                            price: item.price,
                            quantity: 1,
                            image: item.image,
                          });
                          toast.success(`${item.name} added to cart`);
                        }}
                        className="w-full"
                      >
                        Add to Cart
                      </GlassButton>
                    </TiltCard>
                  ))}
                </div>
              </div>
            )}

            {/* Order History */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <RotateCcw size={20} className="text-primary-500" /> Order
                History
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.length === 0 && (
                  <div className="col-span-full text-center text-slate-500 bg-dark-900/50 p-12 rounded-2xl border border-dark-800">
                    No orders yet. Start your pizza journey!
                  </div>
                )}
                {orders.map((order) => {
                  const isActive = !["delivered", "cancelled"].includes(
                    order.status,
                  );
                  return (
                    <motion.div
                      key={order.id}
                      whileHover={{ y: -4 }}
                      className={`relative p-5 rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer ${
                        isActive
                          ? "bg-[#273449] border-primary-500/30"
                          : "bg-[#1E293B] border-white/10"
                      } border hover:shadow-xl`}
                      onClick={() =>
                        isActive
                          ? navigate(`/order-tracking/${order.id}`)
                          : null
                      }
                    >
                      {/* Active pulse indicator */}
                      {isActive && (
                        <div className="absolute top-3 right-3">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-white">
                          Order #{order.id?.slice(-6).toUpperCase()}
                        </span>
                        <span className="font-bold text-primary-500">
                          ₹{order.totalAmount}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-3">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>

                      {/* Items preview */}
                      <div className="flex gap-2 mb-3 overflow-hidden">
                        {order.items
                          .slice(0, 3)
                          .map(
                            (item, i) =>
                              item.image && (
                                <img
                                  key={i}
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-dark-700"
                                />
                              ),
                          )}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-xs font-bold text-slate-400">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full border ${
                            order.status === "delivered"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : order.status === "cancelled"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-primary-500/10 text-primary-400 border-primary-500/20"
                          }`}
                        >
                          {order.status.replace("_", " ").toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          {!isActive && order.status === "delivered" && (
                             <GlassButton
                               variant="primary"
                               className="!px-3 !py-1 text-xs font-bold h-auto rounded-lg"
                               onClick={(e) => handleReorder(order, e)}
                             >
                               Reorder
                             </GlassButton>
                          )}
                          {isActive && (
                            <span className="text-xs font-bold text-primary-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Track
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 bg-dark-900/60 backdrop-blur-md border border-dark-800 rounded-3xl p-6 shadow-2xl">
            <CustomerProfile />
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-24 right-6 z-50 bg-[#f97316] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(249,115,22,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
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
