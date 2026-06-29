import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { MenuItem } from "../types/models";
import { useCartStore } from "../lib/store";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import PizzaLoader from "../components/ui/PizzaLoader";
import { useCartAnimation } from "../components/ui/CartAnimationProvider";
import { useDataStore } from "../lib/dataStore";

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { triggerAnimation } = useCartAnimation();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Customization State
  const [selectedSize, setSelectedSize] = useState<string>("regular");
  const [selectedCrust, setSelectedCrust] = useState<string>("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // 3D Interaction State
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      try {
        const { products, combos } = useDataStore.getState();
        let data: any = products.find(p => p.id === productId);
        let isCombo = false;
        
        if (!data) {
          data = combos.find(c => c.id === productId);
          if (data) isCombo = true;
        }

        // If not in cache, fallback to Firestore
        if (!data) {
          let docSnap = await getDoc(doc(db, "products", productId));
          if (!docSnap.exists()) {
            docSnap = await getDoc(doc(db, "combos", productId));
            if (docSnap.exists()) {
              isCombo = true;
              data = { id: docSnap.id, ...docSnap.data() };
            }
          } else {
            data = { id: docSnap.id, ...docSnap.data() };
          }
        }

        if (data) {
          const productData: MenuItem = {
            id: data.id,
            name: isCombo ? data.name : data.productName,
            description: data.description,
            category: isCombo ? "combo" : data.category,
            pricingMode: data.pricingMode || "fixed",
            basePrice: data.basePrice,
            offerPrice: data.offerPrice || 0,
            discountPercentage: data.discountPercentage || 0,
            image: data.imageUrl,
            isVegetarian: isCombo ? false : data.isVegetarian,
            isAvailable: data.isActive,
            productIds: data.productIds,
            variants: isCombo ? [] : data.variants || [
              { name: "Regular", price: 0 },
              { name: "Medium", price: 99 },
              { name: "Large", price: 199 },
            ],
            crusts: isCombo ? [] : data.crusts || [
              { name: "Classic Hand Tossed", price: 0 },
              { name: "Cheese Burst", price: 99 },
              { name: "Wheat Thin Crust", price: 49 },
            ],
            addons: isCombo ? [] : data.addons || [
              { name: "Extra Cheese", price: 40 },
              { name: "Black Olives", price: 30 },
              { name: "Jalapeños", price: 30 },
              { name: "Sweet Corn", price: 20 },
              { name: "Paneer", price: 50 },
            ],
          };
          setItem(productData);

          if (productData.variants?.length) {
            setSelectedSize(productData.variants[0].name);
          }
          if (productData.crusts?.length) {
            setSelectedCrust(productData.crusts[0].name);
          }
        }
      } catch (err) {
        console.error("Error fetching product", err);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max rotation 15 degrees
    const rX = ((y - centerY) / centerY) * -15;
    const rY = ((x - centerX) / centerX) * 15;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const toggleAddOn = (addOnName: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addOnName)
        ? prev.filter((name) => name !== addOnName)
        : [...prev, addOnName],
    );
  };

  // Price Calculation Engine
  const calculateTotal = () => {
    if (!item) return 0;

    let total = item.pricingMode === 'offer' && item.offerPrice 
                ? item.offerPrice 
                : item.discountPercentage && item.discountPercentage > 0 
                  ? item.basePrice * (1 - item.discountPercentage / 100)
                  : item.basePrice;

    // Size addition
    if (item.variants) {
      const variant = item.variants.find((v) => v.name === selectedSize);
      if (variant) {
        total += variant.price;
      }
    }

    // Crust addition
    if (item.crusts && selectedCrust) {
      const crust = item.crusts.find((c) => c.name === selectedCrust);
      if (crust) {
        total += crust.price;
      }
    }

    // Addons addition
    if (item.addons && selectedAddOns.length > 0) {
      selectedAddOns.forEach((addOnName) => {
        const addOn = item.addons!.find((a) => a.name === addOnName);
        if (addOn) {
          total += addOn.price;
        }
      });
    }

    return Math.round(total);
  };

  const pizzaImageRef = useRef<HTMLImageElement>(null);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!item || !item.isAvailable) return;

    const finalPrice = calculateTotal();

    // Generate deterministic ID for proper grouping in cart
    const configHash = `${selectedSize}-${selectedCrust}-${selectedAddOns.sort().join(",")}`;
    const cartItemId = `${item.id}-${configHash}`;

    addItem({
      id: cartItemId,
      menuItemId: item.id!,
      name: item.name,
      price: finalPrice,
      quantity: 1,
      image: item.image,
      variant: selectedSize,
      crust: selectedCrust,
      addons: selectedAddOns,
    });

    // Prefer to start animation from the pizza image center for a cinematic arc
    let startPos: { clientX: number; clientY: number } = e;
    if (pizzaImageRef.current) {
      const rect = pizzaImageRef.current.getBoundingClientRect();
      startPos = {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
    }
    triggerAnimation(startPos, item.image || '');

    toast.success("Added to Cart!", { icon: "✨" });

    setTimeout(() => {
      navigate("/menu");
    }, 1200);
  };


  if (loading) {
    return <PizzaLoader message="Preparing your product..." />;
  }

  if (!item) {
    return (
      <div className="h-screen flex items-center justify-center font-bold text-red-500">
        Product Not Found
      </div>
    );
  }

  const finalPrice = calculateTotal();

  // Determine visual scaling based on variant index (position = size).
  // Index 0 = smallest, last = largest. Works with any variant names.
  const variantIndex = item?.variants?.findIndex(
    (v) => v.name === selectedSize
  ) ?? 0;
  const variantCount = item?.variants?.length ?? 1;
  // Map index linearly: first = 0.72, last = 1.18
  const sizeScale =
    variantCount <= 1
      ? 1
      : 0.72 + ((variantIndex / (variantCount - 1)) * 0.46);

  // Pizza visual diameter labels for the size buttons
  const SIZE_DIAMETERS = ['7"', '9"', '12"', '14"', '18"'];

  return (
    <PageTransition className="max-w-7xl mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)]">
      {/* Back Button */}
      <button
        onClick={() => navigate("/menu")}
        className="mb-8 flex items-center gap-2 font-bold text-slate-500 hover:text-primary-600 transition-colors"
      >
        <span>&larr;</span> Back to Menu
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Left Column: 3D Interactive Showcase */}
        <div
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center min-h-[400px] lg:min-h-[600px] shadow-2xl"
          style={{ perspective: 1000 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute top-6 left-6 z-20 flex gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border shadow-sm backdrop-blur-md">
                {item.category === "combo" ? (
                  <span className="text-primary-400 border-primary-500/30">COMBO 🚀</span>
                ) : item.isVegetarian ? (
                  <span className="text-success border-success/30">VEG</span>
                ) : (
                  <span className="text-error border-error/30">NON-VEG</span>
                )}
              </span>
          </div>

          <motion.div
            key={`size-${selectedSize}`}          // Re-mounts spring on every size change
            initial={{ scale: sizeScale * 0.85, rotateX: 0, rotateY: 0 }}
            animate={{
              rotateX,
              rotateY,
              scale: sizeScale,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 18,
              mass: 0.7,
            }}
            className="relative z-10 w-3/4 h-3/4 flex items-center justify-center pointer-events-none"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Ground shadow — scales with pizza */}
            <motion.div
              className="absolute -bottom-8 w-3/4 h-8 bg-black/25 dark:bg-black/60 blur-2xl rounded-[100%]"
              animate={{
                scaleX: sizeScale,
                scaleY: sizeScale * 0.6,
                opacity: 0.6 - Math.abs(rotateX) / 40,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            />

            {/* Orange glow pulse on size change */}
            <motion.div
              key={`glow-${selectedSize}`}
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0.7, scale: 1.1 }}
              animate={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)' }}
            />

            <img
              ref={pizzaImageRef}
              src={item.image}
              alt={item.name}
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{ transform: "translateZ(50px)" }}
            />
          </motion.div>
        </div>

        {/* Right Column: Configuration & Add to Cart */}
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
              {item.name}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {item.description}
            </p>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700 w-full" />

          {/* Size Selector */}
          {item.variants && item.variants.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                1. Choose Size
              </h3>
              <div className="flex flex-wrap gap-3">
                {item.variants.map((v, vi) => {
                  const isActive = selectedSize === v.name;
                  // Pizza circle grows with each index
                  const circleSize = 18 + vi * 6; // px: 18, 24, 30, 36…
                  const diameter = SIZE_DIAMETERS[vi] || `${8 + vi * 2}"`;
                  return (
                    <motion.button
                      key={v.name}
                      onClick={() => setSelectedSize(v.name)}
                      whileTap={{ scale: 0.93 }}
                      whileHover={{ scale: 1.04 }}
                      className={`relative flex flex-col items-center gap-2 px-5 py-3 rounded-2xl font-bold capitalize transition-colors duration-200 ${
                        isActive
                          ? "bg-primary-500 text-white shadow-lg shadow-primary-500/40 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary-400"
                      }`}
                    >
                      {/* Pizza circle silhouette */}
                      <motion.div
                        animate={{ scale: isActive ? 1.15 : 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className={`rounded-full border-2 flex items-center justify-center ${
                          isActive ? 'border-white/60 bg-white/20' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
                        }`}
                        style={{ width: circleSize, height: circleSize }}
                      >
                        <span style={{ fontSize: circleSize * 0.5 }}>🍕</span>
                      </motion.div>

                      <span className="text-sm leading-none">{v.name}</span>
                      <span className={`text-[10px] font-normal leading-none ${
                        isActive ? 'text-white/70' : 'text-slate-400'
                      }`}>{diameter}</span>
                      {v.price > 0 && (
                        <span className={`text-[10px] font-bold ${
                          isActive ? 'text-white/80' : 'text-primary-500'
                        }`}>
                          +₹{v.price}
                        </span>
                      )}

                      {/* Active indicator dot */}
                      {isActive && (
                        <motion.div
                          layoutId="size-active-dot"
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-400"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Crust Selector */}
          {item.crusts && item.crusts.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                2. Choose Crust
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.crusts.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedCrust(c.name)}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl font-bold transition-all duration-300 text-left ${
                      selectedCrust === c.name
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-2 border-primary-500"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{c.name}</span>
                    {c.price > 0 && (
                      <span className="text-xs opacity-70">+₹{c.price}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extra Toppings Matrix */}
          {item.addons && item.addons.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                3. Extra Toppings
              </h3>
              <div className="flex flex-wrap gap-3">
                {item.addons.map((addon) => {
                  const isSelected = selectedAddOns.includes(addon.name);
                  return (
                    <button
                      key={addon.name}
                      onClick={() => toggleAddOn(addon.name)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                        isSelected
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800"
                          : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-green-400"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded shadow-inner flex items-center justify-center transition-colors ${isSelected ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span>{addon.name}</span>
                      <span className="text-xs opacity-60">
                        +₹{addon.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Price & Checkout Footer */}
          <div className="sticky bottom-4 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              {item.discountPercentage && item.discountPercentage > 0 ? (
                <>
                  <span className="text-sm text-slate-500 line-through font-medium">₹{item.basePrice}</span>
                  <span className="text-3xl md:text-5xl font-black text-accent-500 tracking-tight drop-shadow-[0_2px_10px_rgba(249,115,22,0.3)]">
                    ₹{calculateTotal()}
                  </span>
                </>
              ) : (
                <span className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-xl">
                  ₹{calculateTotal()}
                </span>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!item.isAvailable}
              className="bg-primary-600 hover:bg-primary-700 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary-500/30 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
