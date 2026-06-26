import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
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

  const updateStatus = async (
    order: Order,
    newStatus: string,
    partnerId?: string,
  ) => {
    try {
      const dataToUpdate: any = { status: newStatus };
      if (partnerId) {
        dataToUpdate.deliveryPartnerId = partnerId;
      }
      await updateDoc(doc(db, "orders", order.id!), dataToUpdate);

      // Trigger Email Notification
      if (["preparing", "cancelled"].includes(newStatus)) {
        fetch("/api/email/transactional", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "ORDER_STATUS_CHANGED",
            data: {
              orderId: order.id,
              status: newStatus,
              customerEmail: order.customerInfo?.email,
            },
          }),
        }).catch((e) => console.error("Email trigger failed:", e));
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );

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
            {activeOrders.length}
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {activeOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#1E293B] border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start border-l-4 border-primary-500 hover:shadow-lg transition-shadow"
            >
              <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    Order #{order.id?.slice(-6).toUpperCase()}
                  </h3>
                  <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {order.status.replace("_", " ")}
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
                    onClick={() => updateStatus(order, "accepted")}
                    className="w-full bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                  >
                    Accept Order
                  </button>
                )}
                {order.status === "accepted" && (
                  <button
                    onClick={() => updateStatus(order, "preparing")}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-xl font-bold shadow-sm transition-transform hover:-translate-y-1"
                  >
                    Start Cooking
                  </button>
                )}
                {order.status === "preparing" && (
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
          {activeOrders.length === 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center text-slate-400 font-medium">
              No active orders right now. Waiting for new orders...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
