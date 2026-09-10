import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles, Flame, Leaf, Award, PartyPopper, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

export interface StoryItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  description: string;
  imageUrl: string;
  actionText: string;
  actionLink: string;
  iconName: "sparkles" | "flame" | "leaf" | "award" | "party";
}

export const HOME_STORIES: StoryItem[] = [
  {
    id: "whats-new",
    title: "Black Truffle Margherita",
    subtitle: "New Chef Exclusive",
    badge: "Limited Edition",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    description: "Hand-stretched sourdough infused with white truffle olive oil, San Marzano coulis, and fresh bocconcini.",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80",
    actionText: "Taste The Sensation",
    actionLink: "/menu?category=pizza",
    iconName: "sparkles",
  },
  {
    id: "hot-deals",
    title: "Flat ₹150 OFF",
    subtitle: "Weekend Feast Pass",
    badge: "Use Code: OLIVE150",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    description: "Get instant ₹150 discount on any wood-fired order above ₹499. Apply coupon at checkout!",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80",
    actionText: "Claim Coupon & Order",
    actionLink: "/menu",
    iconName: "flame",
  },
  {
    id: "chef-specials",
    title: "Artisanal 72-Hour Dough",
    subtitle: "Italian Beechwood Baked",
    badge: "Chef Signature",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    description: "Naturally fermented for 72 hours for an ultra-airy crust with caramelized leopard spotting.",
    imageUrl: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1000&q=80",
    actionText: "View Masterpieces",
    actionLink: "/menu?category=pizza",
    iconName: "award",
  },
  {
    id: "pure-veg",
    title: "Dedicated Pure Veg Kitchen",
    subtitle: "100% Vegetarian Certified",
    badge: "Pure Veg Promise",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    description: "Strictly segregated prep tables, separate stone ovens, and certified fresh dairy paneer & mozzarella.",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80",
    actionText: "Explore Veg Menu",
    actionLink: "/menu?vegOnly=true",
    iconName: "leaf",
  },
  {
    id: "party-combos",
    title: "The Midnight Feast Combo",
    subtitle: "Save ₹250 Tonight",
    badge: "Big Savings",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    description: "1 Large Gourmet Pizza + Stuffed Garlic Breadsticks + 2 Refreshing Drinks for only ₹599.",
    imageUrl: "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=1000&q=80",
    actionText: "Grab Combo Deal",
    actionLink: "/menu?category=combo",
    iconName: "party",
  },
];

interface StoryViewerModalProps {
  activeStoryIndex: number | null;
  onClose: () => void;
}

export default function StoryViewerModal({ activeStoryIndex, onClose }: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(activeStoryIndex ?? 0);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeStoryIndex !== null) {
      setCurrentIndex(activeStoryIndex);
      setProgress(0);
    }
  }, [activeStoryIndex]);

  // Story auto-advance timer
  useEffect(() => {
    if (activeStoryIndex === null) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < HOME_STORIES.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // ~5 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, activeStoryIndex, onClose]);

  if (activeStoryIndex === null) return null;

  const currentStory = HOME_STORIES[currentIndex] || HOME_STORIES[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < HOME_STORIES.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    navigate(currentStory.actionLink);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden bg-[#0A0C10] border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col justify-between select-none"
        >
          {/* Background Story Image */}
          <div className="absolute inset-0 z-0">
            <img
              src={currentStory.imageUrl}
              alt={currentStory.title}
              className="w-full h-full object-cover"
            />
            {/* Dark glass gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06070A] via-[#06070A]/40 to-[#06070A]/80" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
          </div>

          {/* Top Progress Bars & Header */}
          <div className="relative z-20 p-4 pt-5">
            {/* Story indicators */}
            <div className="flex items-center gap-1.5 mb-3">
              {HOME_STORIES.map((_, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                    style={{
                      width:
                        idx === currentIndex
                          ? `${progress}%`
                          : idx < currentIndex
                          ? "100%"
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Story Author / Header Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FF8800] p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs">
                    🍕
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Olive Pizza</h4>
                  <span className="text-[10px] text-slate-300">Live Story</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Invisible Left/Right tap zones for quick navigation */}
          <div className="absolute inset-y-20 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-20 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNext} />

          {/* Navigation Chevron Buttons */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {currentIndex < HOME_STORIES.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Story Content & Direct Action CTA */}
          <div className="relative z-20 p-5 sm:p-6 pb-6 bg-gradient-to-t from-[#06070A] via-[#06070A]/90 to-transparent">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border mb-2.5 backdrop-blur-md ${currentStory.badgeColor}`}
            >
              {currentStory.iconName === "sparkles" && <Sparkles className="w-3.5 h-3.5" />}
              {currentStory.iconName === "flame" && <Flame className="w-3.5 h-3.5" />}
              {currentStory.iconName === "award" && <Award className="w-3.5 h-3.5" />}
              {currentStory.iconName === "leaf" && <Leaf className="w-3.5 h-3.5" />}
              {currentStory.iconName === "party" && <PartyPopper className="w-3.5 h-3.5" />}
              <span>{currentStory.badge}</span>
            </span>

            <h3 className="text-2xl sm:text-3xl font-serif font-black text-white leading-tight mb-1.5">
              {currentStory.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 mb-5 leading-relaxed">
              {currentStory.description}
            </p>

            <button
              onClick={handleAction}
              className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 hover:scale-102 active:scale-98 transition-transform"
            >
              <span>{currentStory.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
