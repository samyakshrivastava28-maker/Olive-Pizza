import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../../lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

export default function TestimonialsSection({ config }: { config: any }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      try {
        const q = query(collection(db, 'reviews'), where('status', '==', 'approved'), limit(6));
        const snap = await getDocs(q);
        if (isMounted) {
          const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  return (
    <div className="py-12 px-4">
      <h3 className="text-3xl font-bold text-center text-white mb-10">{config.headline || 'Verified Customer Reviews'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {reviews.map((r, idx) => (
          <motion.div 
            key={r.id || idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md"
          >
            {r.rating && (
              <div className="flex text-amber-400 mb-3 text-sm font-bold">
                {'★'.repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)))}
                <span className="text-slate-300 ml-2 font-normal">({r.rating}/5)</span>
              </div>
            )}
            <p className="text-slate-300 italic mb-4">"{r.comment || r.text}"</p>
            <p className="text-white font-bold text-sm">— {r.customerName || r.name || 'Verified Customer'}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
