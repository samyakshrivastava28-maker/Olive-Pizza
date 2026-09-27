import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Order, CartItem } from "../../../types/models";
import { useNavigate } from "react-router";
import { useCartStore } from "../../../lib/store";
import { toast } from "react-hot-toast";
import { GlassButton } from "../../ui/glass/GlassSystem";
import { MapPin, RotateCcw, Search } from "lucide-react";

interface Props {
  orders: Order[];
}

export default function OrderHistory({ orders }: Props) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.dailyOrderNumber?.toLowerCase().includes(lower) || 
      o.id?.toLowerCase().includes(lower)
    );
  }, [orders, searchTerm]);

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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2">
        <h2 className="text-xl sm:text-2xl text-slate-900 font-black flex items-center gap-2">
          <RotateCcw className="text-primary-600 w-5 h-5" /> Order History
        </h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Order Number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-600 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.length === 0 && (
          <div className="col-span-full text-center text-slate-500 bg-[#FAF8F5] p-12 rounded-2xl border border-slate-200">
            {searchTerm ? "No orders found matching your search." : "No orders yet. Start your pizza journey!"}
          </div>
        )}
        
        {filteredOrders.map((order, idx) => {
          const isActive = !["delivered", "cancelled"].includes(order.status);
          
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -3 }}
              className={`relative p-5 rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer border hover:shadow-md ${
                isActive
                  ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                  : "bg-white border-slate-200"
              }`}
              onClick={() => navigate(`/order-tracking/${order.id}`)}
            >
              {/* Active pulse indicator */}
              {isActive && (
                <div className="absolute top-4 right-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-primary-800 text-sm sm:text-base">
                      {order.billNumber || (order.permanentBillNo ? `#${order.permanentBillNo}` : '')}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {order.dailyOrderNumber || order.orderNumber || `#${order.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                      {order.fulfillmentType === 'pickup' || order.deliveryType === 'takeaway' ? 'Pickup' : 'Delivery'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(order.createdAt).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-primary-800 text-base sm:text-lg block">
                    ₹{order.totalAmount}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {(order.paymentMethod || 'COD').toUpperCase()} · {(order.paymentStatus || 'PAID').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Cancelled Reason Snippet */}
              {order.status === "cancelled" && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                  <span className="font-bold text-red-700 block uppercase tracking-wider text-[10px] mb-0.5">
                    Cancellation Reason:
                  </span>
                  <p className="italic font-medium text-red-900">
                    {order.cancellationReason || (order as any).cancellation_reason || (order as any).lastRejectionReason || (order as any).reason ? `"${order.cancellationReason || (order as any).cancellation_reason || (order as any).lastRejectionReason || (order as any).reason}"` : "Cancelled by restaurant."}
                  </p>
                </div>
              )}

              {/* Items preview */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2 overflow-hidden">
                  {order.items.slice(0, 4).map((item: CartItem, i: number) => (
                    item.image && (
                      <div key={i} className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 group shrink-0 shadow-xs">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    )
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-700 font-medium truncate">
                  {order.items.map(it => `${it.name}${it.quantity > 1 ? ` (×${it.quantity})` : ''}`).join(', ')}
                </p>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 flex-wrap gap-2">
                <span
                  className={`px-3 py-1 text-[11px] font-bold rounded-full border ${
                    order.status === "delivered"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : order.status === "cancelled"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-primary-50 text-primary-800 border-primary-200"
                  }`}
                >
                  {order.status.replace("_", " ").toUpperCase()}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bill/${order.billReference || order.id}`);
                    }}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-all shadow-xs cursor-pointer"
                    title="View & Print Official Bill"
                  >
                    🧾 Bill
                  </button>
                  {order.status === "delivered" && (
                    <button
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary-600 hover:bg-primary-700 text-champagne shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                      onClick={(e) => handleReorder(order, e)}
                    >
                      <RotateCcw className="w-3 h-3 mr-0.5 inline" /> Reorder
                    </button>
                  )}
                  {isActive && (
                    <span className="text-xs font-bold text-primary-800 flex items-center gap-1 bg-primary-100 px-3 py-1.5 rounded-lg border border-primary-200">
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
