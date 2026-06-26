import { useState, useEffect } from "react";
import { useCartStore } from "../lib/store";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { RESTAURANT_LOCATION, MAX_DELIVERY_RADIUS_KM } from "../lib/config";
import { calculateDistance } from "../lib/utils";
import { Minus, Plus, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { MenuItem } from "../types/models";

export default function Cart() {
  const { items, total, addItem, removeItem, updateQuantity } = useCartStore();
  const navigate = useNavigate();

  const [isOutsideDeliveryZone, setIsOutsideDeliveryZone] = useState(false);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = calculateDistance(
            RESTAURANT_LOCATION.lat,
            RESTAURANT_LOCATION.lng,
            latitude,
            longitude,
          );
          if (distance > MAX_DELIVERY_RADIUS_KM) {
            setIsOutsideDeliveryZone(true);
          }
        },
        (error) => console.log("Geolocation error", error),
        { timeout: 10000, maximumAge: 60000 },
      );
    }

    // Fetch recommendations based on current cart
    const fetchRecommendations = async () => {
      try {
        const q = query(collection(db, "products"), limit(20));
        const snap = await getDocs(q);
        const allItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        
        // Simple logic: if they have pizza, suggest sides/beverages
        const hasPizza = items.some(i => i.name.toLowerCase().includes('pizza'));
        let recs = allItems.filter(i => !items.some(cartItem => cartItem.id === i.id));
        
        if (hasPizza) {
           recs = recs.filter(i => i.category === 'sides' || i.category === 'beverage' || i.category === 'dessert');
        }
        
        // Take top 3
        setRecommendations(recs.slice(0, 3));
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchRecommendations();
  }, [items]);

  const handleProceed = () => {
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-black text-white mb-4">
          Your Cart is Empty
        </h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Looks like you haven't added any delicious pizzas yet!
        </p>
        <button
          onClick={() => navigate("/menu")}
          className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-full font-bold transition-colors"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <PageTransition className="w-full max-w-5xl mx-auto px-4 pb-32 md:pb-8">
      <h1 className="text-3xl md:text-4xl font-black text-white mb-8 mt-4 md:mt-8 tracking-tight">
        Your Order
      </h1>

      {isOutsideDeliveryZone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-500/10 border border-accent-500/20 rounded-2xl p-4 mb-6"
        >
          <p className="text-accent-500 font-bold text-sm md:text-base">
            You are outside our hot-delivery zone.
          </p>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Order will be prepared for self-pickup.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-dark-900 border border-dark-800 p-4 rounded-2xl flex gap-4 items-center"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-white truncate">
                    {item.name}
                  </h3>
                  <div className="text-accent-400 font-bold mt-1">
                    ₹{item.price}
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-3 bg-dark-950 rounded-full p-1 border border-dark-700">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            Math.max(1, item.quantity - 1),
                          )
                        }
                        className="w-7 h-7 rounded-full bg-dark-800 flex items-center justify-center text-white active:scale-90 transition-transform"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-4 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded-full bg-dark-800 flex items-center justify-center text-white active:scale-90 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-3 text-slate-500 hover:text-error hover:bg-error/10 rounded-full transition-colors self-start md:self-center"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Smart Combo Recommendations */}
          {recommendations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 bg-dark-900 border border-dark-800 p-6 rounded-3xl"
            >
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Sparkles className="text-accent-500 w-5 h-5" /> Customers also ordered
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recommendations.map(rec => (
                  <div key={rec.id} className="bg-dark-950 p-4 rounded-2xl border border-dark-800 flex flex-col items-center text-center">
                    <img src={rec.image} alt={rec.name} className="w-20 h-20 object-cover rounded-full mb-3" />
                    <h4 className="font-bold text-white text-sm mb-1">{rec.name}</h4>
                    <p className="text-accent-400 font-bold text-sm mb-3">₹{rec.basePrice}</p>
                    <button
                      onClick={() => addItem({ id: rec.id!, menuItemId: rec.id!, name: rec.name, price: rec.basePrice, quantity: 1, image: rec.image })}
                      className="w-full bg-dark-800 hover:bg-primary-600 text-white py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Desktop Summary Card */}
        <div className="hidden lg:block bg-dark-900 border border-dark-800 p-6 rounded-3xl h-fit sticky top-24">
          <h2 className="text-xl font-bold mb-6 text-white">Order Summary</h2>
          <div className="flex justify-between mb-4 text-slate-400">
            <span>Subtotal</span>
            <span className="text-white">₹{total}</span>
          </div>
          <div className="flex justify-between font-black text-2xl mb-8 pt-4 border-t border-dark-800 text-white">
            <span>Total</span>
            <span className="text-accent-400">₹{total}</span>
          </div>
          <button
            onClick={handleProceed}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-full font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg shadow-md"
          >
            Proceed to Checkout
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      <div className="lg:hidden fixed bottom-[60px] left-0 right-0 p-4 bg-gradient-to-t from-dark-950 via-dark-950 to-transparent z-40 pointer-events-none">
        <div className="pointer-events-auto bg-dark-800 border border-dark-700 rounded-full p-2 flex items-center justify-between shadow-2xl backdrop-blur-md">
          <div className="pl-4">
            <p className="text-xs text-slate-400 font-medium">Total to pay</p>
            <p className="text-xl font-black text-accent-400 leading-none mt-0.5">
              ₹{total}
            </p>
          </div>
          <button
            onClick={handleProceed}
            className="bg-primary-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 active:scale-95 transition-transform"
          >
            Checkout
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
