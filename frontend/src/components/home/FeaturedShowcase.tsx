import React from "react";
import { motion } from "framer-motion";
import { Star, Clock, Flame, Heart, ShoppingBag, Plus, Sparkles } from "lucide-react";
import { useCartStore } from "../../lib/store";
import { addToWishlist, removeFromWishlist } from "../../lib/wishlist";
import { useAuthStore } from "../../lib/store";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  basePrice?: number;
  image?: string;
  rating?: number;
  reviewsCount?: number;
  preparationTime?: string;
  isSpicy?: boolean;
  isVeg?: boolean;
  tags?: string[];
}

interface Props {
  products: Product[];
  wishlistIds: string[];
}

export default function FeaturedShowcase({ products, wishlistIds }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const { user, isAuthenticated } = useAuthStore();

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price || product.basePrice || 299,
      quantity: 1,
      image: product.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80",
    } as any);

    toast.success(`Added ${product.name} to cart! 🍕`, {
      style: {
        background: "#0f172a",
        color: "#ffffff",
        border: "1px solid rgba(249,115,22,0.3)",
      },
    });
  };

  const handleWishlistToggle = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !user) {
      toast.error("Please login to save items to your wishlist.");
      return;
    }
    const isWishlisted = wishlistIds.includes(productId);
    if (isWishlisted) {
      await removeFromWishlist(user.uid, productId);
      toast.success("Removed from Wishlist");
    } else {
      await addToWishlist(user.uid, productId);
      toast.success("Saved to Wishlist ❤️");
    }
  };

  return (
    <section className="relative py-12 md:py-20 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 backdrop-blur-md mb-3">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-300">
                Chef's Masterpieces
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Featured <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">Artisan Pizzas</span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm md:text-base max-w-md mt-2 md:mt-0 font-medium">
            Hand-stretched sourdough base, imported San Marzano tomatoes, and 100% fresh Mozzarella Fior di Latte.
          </p>
        </div>

        {/* 3D Showcase Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 8).map((product, idx) => {
            const isWishlisted = wishlistIds.includes(product.id);
            const price = product.price || product.basePrice || 299;
            const rating = product.rating || 4.9;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                whileHover={{ y: -10 }}
                className="group relative rounded-3xl backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col justify-between"
                style={{
                  background: "linear-gradient(160deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                }}
              >
                {/* Top Glass Header */}
                <div className="relative p-4 pb-0 flex justify-between items-center z-10">
                  {/* Rating Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-xs font-bold text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{rating}</span>
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => handleWishlistToggle(product.id, e)}
                    className={`p-2.5 rounded-full border backdrop-blur-md transition-all ${
                      isWishlisted
                        ? "bg-red-500/20 border-red-500/40 text-red-400"
                        : "bg-black/40 border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-500" : ""}`} />
                  </button>
                </div>

                {/* Floating 3D Pizza Showcase Image */}
                <div className="relative h-52 sm:h-56 flex items-center justify-center p-4 my-2">
                  {/* Ambient Glow Disk Behind Pizza */}
                  <div className="absolute w-36 h-36 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-2xl group-hover:scale-125 transition-transform duration-500" />
                  
                  <img
                    src={product.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80"}
                    alt={product.name}
                    className="w-44 h-44 sm:w-48 sm:h-48 object-cover rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.6)] group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 relative z-10"
                    loading="lazy"
                  />
                </div>

                {/* Content & Action Bar */}
                <div className="p-5 pt-2 relative z-10 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/30 text-[10px] font-black uppercase text-green-400 tracking-wider">
                        100% Pure Veg
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium ml-auto">
                        <Clock className="w-3 h-3 text-orange-400" /> 25-30m
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-1 min-h-[32px]">
                      {product.description || "Freshly baked sourdough crust with artisan cheeses and organic basil."}
                    </p>
                  </div>

                  {/* Price & Add to Cart */}
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Starting at</span>
                      <span className="text-xl font-black text-white">₹{price}</span>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary-600 to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
