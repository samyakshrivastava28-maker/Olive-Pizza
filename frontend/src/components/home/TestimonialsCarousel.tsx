import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote, CheckCircle2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

interface RealReview {
  id: string;
  customerName?: string;
  name?: string;
  rating?: number;
  comment?: string;
  text?: string;
  createdAt?: string;
}

export default function TestimonialsCarousel() {
  const [reviews, setReviews] = useState<RealReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      try {
        const q = query(collection(db, "reviews"), where("status", "==", "approved"), limit(10));
        const snap = await getDocs(q);
        if (isMounted) {
          const loaded: RealReview[] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RealReview));
          setReviews(loaded);
        }
      } catch {
        if (isMounted) setReviews([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReviews();
    return () => { isMounted = false; };
  }, []);

  // Strict Zero Fake Data Rule: If no verified database reviews exist, do not render this section
  if (loading || reviews.length === 0) {
    return null;
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const current = reviews[currentIndex];
  const starCount = Math.min(5, Math.max(1, Number(current.rating) || 5));

  return (
    <section className="relative py-16 md:py-24 z-10 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Title */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 backdrop-blur-md mb-3">
            <Quote className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Customer Feedback
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Verified Guest Impressions
          </h2>
        </div>

        {/* Testimonial Glass Card */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.4 }}
              className="p-8 sm:p-12 rounded-3xl backdrop-blur-2xl border border-white/10 relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.9) 100%)",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
              }}
            >
              {/* Stars if available */}
              {current.rating && (
                <div className="flex gap-1 mb-6">
                  {[...Array(starCount)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}

              {/* Quote Comment */}
              <p className="text-slate-200 text-base sm:text-xl font-medium leading-relaxed italic mb-8">
                "{current.comment || current.text}"
              </p>

              {/* User Profile Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-300 font-bold text-sm">
                    {(current.customerName || current.name || 'G')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base flex items-center gap-1.5">
                      {current.customerName || current.name || 'Verified Customer'} <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      Verified Dine-in / Delivery Guest
                    </p>
                  </div>
                </div>

                {/* Controls */}
                {reviews.length > 1 && (
                  <div className="flex gap-2">
                    <button
                      onClick={prevSlide}
                      className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white transition-all active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white transition-all active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
