import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { 
  XCircle, 
  ShoppingBag, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  ReceiptText,
  Home,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { fetchApi } from "../lib/config";
import { GlassButton } from "../components/ui/glass/GlassSystem";

interface OrderDetail {
  id: string;
  orderNumber?: string;
  dailyOrderNumber?: number;
  createdAt?: any;
  cancelledAt?: any;
  status: string;
  cancellationReason?: string;
  cancellationExplanation?: string;
  cancellationSource?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  refundStatus?: string;
}

export default function OrderCancelledPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAndAcknowledge() {
      if (!id) return;
      try {
        setLoading(true);
        const docRef = doc(db, "orders", id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as OrderDetail;
          setOrder(data);

          // Authoritative server-backed acknowledgement
          try {
            await fetchApi(`/api/orders/${id}/acknowledge-cancellation`, { method: 'POST' });
          } catch (ackErr) {
            console.warn("Failed to record server acknowledgement:", ackErr);
          }
          // Also set local marker for immediate suppression
          localStorage.setItem(`dismissed_cancel_${id}`, "true");
        }
      } catch (err) {
        console.error("Error loading cancelled order:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAndAcknowledge();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading cancellation details...</p>
      </div>
    );
  }

  const orderNum = order?.dailyOrderNumber ? `#${order.dailyOrderNumber}` : order?.orderNumber || (id ? `#${id.slice(-6).toUpperCase()}` : "#ORDER");
  const isTimeout = order?.cancellationReason === "RESTAURANT_ACCEPT_TIMEOUT";
  
  const createdDate = order?.createdAt
    ? new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "Recently";

  const cancelledDate = order?.cancelledAt
    ? new Date(order.cancelledAt?.toDate ? order.cancelledAt.toDate() : order.cancelledAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "Just now";

  const isPaid = (order?.paymentStatus || "").toLowerCase() === "paid";
  const isCod = (order?.paymentMethod || "").toLowerCase() === "cod";

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 text-white pt-20 pb-28 px-4">
      <div className="max-w-lg mx-auto">
        {/* Top Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 w-fit transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Main Status Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative bg-dark-900/80 border border-red-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl overflow-hidden mb-6"
        >
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-500 shadow-inner">
              <XCircle size={32} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 inline-block mb-1.5">
                {isTimeout ? "Automatic Timeout" : "Order Cancelled"}
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Order {orderNum}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Clock size={12} className="text-[#c6a052]" />
                Placed: {createdDate}
              </p>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 mb-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider mb-1">
                  Cancellation Reason
                </h4>
                <p className="text-sm font-medium text-white leading-relaxed">
                  {isTimeout
                    ? "The restaurant was unable to accept your order within the required 10-minute window. To ensure you receive fresh, handcrafted food without delays, unaccepted orders are automatically cancelled."
                    : order?.cancellationExplanation || order?.cancellationReason || "The order was cancelled by restaurant operations."}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Cancelled at: <span className="text-slate-300">{cancelledDate}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment & Refund Assurance Box */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 mb-6">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#c6a052] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#c6a052] uppercase tracking-wider mb-1">
                  Payment & Refund Status
                </h4>
                {isCod ? (
                  <p className="text-xs text-slate-300">
                    This was a <strong>Cash on Delivery (COD)</strong> order. No payment was charged.
                  </p>
                ) : isPaid ? (
                  <p className="text-xs text-slate-300">
                    Payment of <strong>₹{order?.totalAmount || 0}</strong> was captured online. Our system has automatically queued a refund to your original payment method (3-5 business days).
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">
                    No payment was captured for this cancelled order.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Items Summary */}
          {order?.items && order.items.length > 0 && (
            <div className="border-t border-white/10 pt-4 mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ReceiptText size={14} /> Order Items
              </h4>
              <div className="space-y-2">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-300">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-semibold text-white">
                      ₹{it.price * it.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm font-bold border-t border-white/5 pt-3 mt-3 text-white">
                <span>Total Amount</span>
                <span className="text-[#c6a052]">₹{order.totalAmount || 0}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <GlassButton
              variant="primary"
              onClick={() => navigate("/menu")}
              className="w-full justify-center py-3.5 text-sm font-bold flex items-center gap-2"
            >
              <ShoppingBag size={18} /> Order Again from Menu
            </GlassButton>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/")}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Home size={14} /> Home Page
              </button>
              <button
                onClick={() => navigate("/customer/dashboard")}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <ReceiptText size={14} /> Order History
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reassurance Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <HelpCircle size={13} /> Need assistance? Call Olive Pizza Support at +91 91799 91234
          </p>
        </div>
      </div>
    </div>
  );
}
