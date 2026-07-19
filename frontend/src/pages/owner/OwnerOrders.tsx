import { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  doc,
  orderBy,
  where,
} from "firebase/firestore";
import { Order } from "../../types/models";
import { playNotificationSound, statusToSoundType } from "../../hooks/useNotificationSound";
import { useNotificationDebugger } from "../../hooks/useNotificationDebugger";
import toast from "react-hot-toast";


export default function OwnerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);

  // Firestore Real-time Listener for ALL orders
  useEffect(() => {
    let isInitialLoad = true;
    const prevStatusMap = new Map<string, string>();

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveOrders = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Order,
        );

        if (!isInitialLoad) {
          // Check for new orders and status changes
          snapshot.docChanges().forEach((change) => {
            const order = { id: change.doc.id, ...change.doc.data() } as Order;
            if (change.type === 'modified') {
              const prevStatus = prevStatusMap.get(order.id!);
              if (prevStatus && prevStatus !== order.status) {
                const soundType = statusToSoundType(order.status || '');
                if (soundType) playNotificationSound(soundType);
              }
            }
            prevStatusMap.set(order.id!, order.status || '');
          });
        } else {
          // Seed prevStatusMap on initial load
          liveOrders.forEach((o) => prevStatusMap.set(o.id!, o.status || ''));
          isInitialLoad = false;
        }

        setOrders(liveOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to listen to live orders", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);


  // Listen to delivery partners
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "delivery_partner"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPartners(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const updateStatus = async (
    order: any,
    newStatus: string,
    partnerId?: string,
  ) => {
    if (processingId === order.id) return;
    setProcessingId(order.id);
    const actionStartTime = Date.now();
    const endpoint = '/api/notifications/action';
    const actionMap: Record<string, string> = {
      cancelled: 'reject',
      preparing: 'start_cooking',
      ready: 'ready',
      partner_assigned: 'assign_delivery',
      accepted: 'accept',
    };
    const action = actionMap[newStatus] || 'accept';

    try {
      const isDebug = localStorage.getItem('diag_mode') === 'true';
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication error: Please log in again.');
        throw new Error('Not authenticated');
      }

      const requestBody = {
        orderId: order.id,
        action,
        currentStage: order.status,
        partnerId,
      };

      console.log(`[OwnerOrders] → ${endpoint}`, { action, orderId: order.id, currentStage: order.status, partnerId });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(isDebug ? { 'X-Debug-Mode': 'true' } : {})
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      const executionMs = Date.now() - actionStartTime;
      const data = await res.json();

      console.log(`[OwnerOrders] ← ${endpoint} status=${res.status} ms=${executionMs} requestId=${data.requestId || 'N/A'}`, data);

      if (isDebug && data.trace) useNotificationDebugger.getState().updateTrace(data.trace);

      if (!res.ok) {
        if (data.duplicate) {
          // Idempotent duplicate - treat as success
          console.log(`[OwnerOrders] Duplicate request safely ignored for order ${order.id}`);
          return;
        }
        const errorMessage = data.error || `Server error (${res.status})`;
        console.error(`[OwnerOrders] Action failed: ${errorMessage} (requestId=${data.requestId}, ms=${executionMs})`);
        toast.error(`Action failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      if (data.success === false && data.message) {
        // Terminal state or no-op
        toast.error(data.message);
        return;
      }

      console.log(`[OwnerOrders] ✅ Action '${action}' succeeded in ${executionMs}ms. newStatus=${data.newStatus}`);

    } catch (error: any) {
      const executionMs = Date.now() - actionStartTime;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        const msg = `Request timed out after 15 seconds. Please check your connection and try again.`;
        console.error(`[OwnerOrders] TIMEOUT for action '${action}' on order ${order.id} ms=${executionMs}`);
        toast.error(msg);
      } else if (error.message !== 'Not authenticated') {
        console.error(`[OwnerOrders] Error on action '${action}' for order ${order.id} ms=${executionMs}:`, error.message, error.stack);
        toast.error(`Failed: ${error.message}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );

  const liveQueueOrders = activeOrders.filter(o => o.orderTiming !== 'scheduled');
  const scheduledOrders = activeOrders.filter(o => o.orderTiming === 'scheduled');

  if (loading)
    return (
      <div className="text-xl font-bold p-8 flex justify-center items-center h-64">
        <div className="animate-pulse text-primary-500">Loading Orders...</div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-white">Order Management</h1>
        <p className="text-slate-400">
          View and manage all your active and past orders.
        </p>
      </div>

      {/* LIVE ORDER QUEUE */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          ⏳ Live Order Queue
          <span className="bg-primary-100 text-primary-700 text-sm px-2 py-1 rounded-full">
            {liveQueueOrders.length}
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {liveQueueOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#1E293B] border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start border-l-4 border-primary-500 hover:shadow-lg transition-shadow"
            >
              <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    {order.dailyOrderNumber || `Order #${order.id?.slice(-6)?.toUpperCase() || 'NEW'}`}
                  </h3>
                  <span className="text-xs font-mono text-slate-500 mt-1 block">ID: {order.id}</span>
                  <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {order.status?.replace("_", " ") || "UNKNOWN"}
                  </span>
                </div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <p className="flex items-center gap-2 mb-1">
                    <span className="text-xl">👤</span>{" "}
                    <span className="font-bold">
                      {order.customerName ||
                        order.customerInfo?.name ||
                        "Guest"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📞</span>{" "}
                    <span className="font-bold">{order.contactPhone}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-xl">📍</span>{" "}
                    {order.deliveryAddress?.addressLine ||
                      (order.deliveryAddress as any)?.fullAddress ||
                      order.address ||
                      "Address not provided"}
                    , {order.deliveryAddress?.pincode || ""}
                  </p>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm items-center border-b border-slate-100 dark:border-slate-800 pb-2"
                    >
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-md border border-white/10"
                          />
                        )}
                        <span className="font-black text-slate-400">
                          {item.quantity}x
                        </span>
                        <span className="font-bold">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-200">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xl font-black text-primary-600 flex justify-between">
                  <span>Total Amount</span>
                  <span>₹{order.totalAmount + 40}</span>
                </div>
              </div>

              <div className="w-full md:w-56 flex flex-col gap-3">
                {order.status === "pending" && (
                  <button
                    disabled={processingId === order.id}
                    onClick={() => updateStatus(order, "accepted")}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                  >
                    {processingId === order.id ? 'Processing...' : 'Accept Order'}
                  </button>
                )}
                {order.status === "accepted" && (
                  <button
                    disabled={processingId === order.id}
                    onClick={() => updateStatus(order, "preparing")}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                  >
                    {processingId === order.id ? 'Processing...' : 'Start Cooking'}
                  </button>
                )}
                {order.status === "preparing" && (
                  <button
                    disabled={processingId === order.id}
                    onClick={() => updateStatus(order, "ready")}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                  >
                    {processingId === order.id ? 'Processing...' : 'Mark as Ready'}
                  </button>
                )}
                {order.status === "ready" && (
                  <div className="flex flex-col gap-2">
                    <select
                      className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-[#1E293B] dark:bg-slate-800 text-sm font-bold"
                      value={selectedPartners[order.id!] || ""}
                      disabled={processingId === order.id}
                      onChange={(e) =>
                        setSelectedPartners({
                          ...selectedPartners,
                          [order.id!]: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Delivery Partner...</option>
                      {partners
                        .filter((p) => p.approvalStatus === "approved")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.status === "online" ? "🟢" : "⚪"}{" "}
                            {p.name || p.email}
                          </option>
                        ))}
                    </select>
                    <button
                      disabled={processingId === order.id}
                      onClick={() => {
                        const pid = selectedPartners[order.id!];
                        if (!pid)
                          return alert(
                            "Please select a delivery partner first!",
                          );
                        updateStatus(order, "partner_assigned", pid);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                    >
                      {processingId === order.id ? 'Processing...' : 'Assign Partner'}
                    </button>
                  </div>
                )}
                <button
                  disabled={processingId === order.id}
                  onClick={() => updateStatus(order, "cancelled")}
                  className="w-full bg-slate-100 hover:bg-red-500 disabled:opacity-50 text-slate-300 hover:text-white p-3 rounded-xl font-bold transition-colors"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          ))}
          {liveQueueOrders.length === 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center text-slate-400 font-medium">
              No live orders right now. Waiting for new orders...
            </div>
          )}
        </div>
      </div>

      {/* SCHEDULED ORDERS */}
      {scheduledOrders.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            📅 Scheduled Orders
            <span className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-full">
              {scheduledOrders.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {scheduledOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#1E293B] border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-blue-400">
                        {order.dailyOrderNumber || `Order #${order.id?.slice(-6)?.toUpperCase() || 'NEW'}`}
                      </h3>
                      <span className="text-xs font-mono text-slate-500 mt-1 block">ID: {order.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/50">
                        {order.scheduledDate === 'today' ? 'Today' : 'Tomorrow'} at {order.scheduledTime}
                      </span>
                      <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {order.status?.replace("_", " ") || "UNKNOWN"}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    <p className="flex items-center gap-2 mb-1">
                      <span className="text-xl">👤</span>{" "}
                      <span className="font-bold">
                        {order.customerName ||
                          order.customerInfo?.name ||
                          "Guest"}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 mb-1">
                      <span className="text-xl">📞</span>{" "}
                      <span className="font-bold">{order.contactPhone}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-xl">📍</span>{" "}
                      {order.deliveryAddress?.addressLine ||
                        (order.deliveryAddress as any)?.fullAddress ||
                        order.address ||
                        "Address not provided"}
                      , {order.deliveryAddress?.pincode || ""}
                    </p>
                  </div>
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm items-center border-b border-slate-100 dark:border-slate-800 pb-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-400">
                            {item.quantity}x
                          </span>
                          <span className="font-bold">{item.name}</span>
                        </div>
                        <span className="font-medium text-slate-200">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xl font-black text-primary-600 flex justify-between">
                    <span>Total Amount</span>
                    <span>₹{order.totalAmount}</span>
                  </div>
                </div>

                <div className="w-full md:w-56 flex flex-col gap-3">
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateStatus(order, "accepted")}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                    >
                      Acknowledge Schedule
                    </button>
                  )}
                  {order.status === "accepted" && (
                    <button
                      onClick={() => updateStatus(order, "preparing")}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                    >
                      Start Cooking Now
                    </button>
                  )}
                  {order.status === "preparing" && (
                  <button
                    onClick={() => updateStatus(order, "ready")}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                  >
                    Mark as Ready
                  </button>
                  )}
                  {order.status === "ready" && (
                    <div className="flex flex-col gap-2">
                      <select
                        className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-[#1E293B] dark:bg-slate-800 text-sm font-bold"
                        value={selectedPartners[order.id!] || ""}
                        onChange={(e) =>
                          setSelectedPartners({
                            ...selectedPartners,
                            [order.id!]: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Delivery Partner...</option>
                        {partners
                          .filter((p) => p.approvalStatus === "approved")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.status === "online" ? "🟢" : "⚪"}{" "}
                              {p.name || p.email}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          const pid = selectedPartners[order.id!];
                          if (!pid)
                            return alert(
                              "Please select a delivery partner first!",
                            );
                          updateStatus(order, "partner_assigned", pid);
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                      >
                        Assign Partner
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => updateStatus(order, "cancelled")}
                    className="w-full bg-slate-100 hover:bg-red-500 text-slate-300 hover:text-white p-3 rounded-xl font-bold transition-colors"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
