import { motion } from "framer-motion";
import { Order, CartItem } from "../../../types/models";
import { useNavigate } from "react-router";
import { useCartStore } from "../../../lib/store";
import { toast } from "react-hot-toast";
import { GlassButton } from "../../ui/glass/GlassSystem";
import { MapPin, RotateCcw } from "lucide-react";

interface Props {
  orders: Order[];
}

export default function OrderHistory({ orders }: Props) {
  const navigate = useNavigate();

  const handleReorder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const { addItem } = useCartStore.getState();
    order.items.forEach((item: CartItem) => {
      addItem({
        id: item.id || Math.random().toString(),
        menuItemId: item.menuItemId || item.id || 'unknown',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      });
    });
    toast.success("Items restored to cart!");
    setTimeout(() => navigate('/cart'), 800);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl text-white font-black flex items-center gap-2">
          <RotateCcw className="text-primary-500" /> Order History
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.length === 0 && (
          <div className="col-span-full text-center text-slate-500 bg-dark-900/50 p-12 rounded-2xl border border-dark-800">
            No orders yet. Start your pizza journey!
          </div>
        )}
        
        {orders.map((order, idx) => {
          const isActive = !["delivered", "cancelled"].includes(order.status);
          
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              className={`relative p-5 rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer border hover:shadow-xl ${
                isActive
                  ? "bg-[#273449] border-primary-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                  : "bg-white/5 border-white/10"
              }`}
              onClick={() => isActive ? navigate(`/order-tracking/${order.id}`) : null}
            >
              {/* Active pulse indicator */}
              {isActive && (
                <div className="absolute top-4 right-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-bold text-white text-lg">
                    Order #{order.id?.slice(-6).toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(order.createdAt).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className="font-black text-primary-400 text-lg">
                  ₹{order.totalAmount}
                </span>
              </div>

              {/* Items preview */}
              <div className="flex gap-2 mb-5 overflow-hidden">
                {order.items.slice(0, 4).map((item: CartItem, i: number) => (
                  item.image && (
                    <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 group">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                  )
                ))}
                {order.items.length > 4 && (
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center justify-between mt-auto">
                <span
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border ${
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
                      className="!px-4 !py-1.5 text-xs font-bold h-auto rounded-lg hover:shadow-lg hover:shadow-primary-500/25"
                      onClick={(e) => handleReorder(order, e)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1 inline" /> Reorder
                    </GlassButton>
                  )}
                  {isActive && (
                    <span className="text-xs font-bold text-primary-400 flex items-center gap-1 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
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
  );
}
