import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Phone } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CancelDeliveryModalProps {
  isOpen: boolean;
  orderNumber: string;
  restaurantPhone?: string;
  isSubmitting?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// ─── Preset Decline Reasons ───────────────────────────────────────────────────

const DECLINE_REASONS = [
  { emoji: "🏍️", label: "Vehicle issue / breakdown" },
  { emoji: "📍", label: "Too far from my location" },
  { emoji: "⏰", label: "Already handling another order" },
  { emoji: "🤒", label: "I'm not feeling well" },
  { emoji: "⛽", label: "Out of fuel" },
  { emoji: "🌧️", label: "Unsafe weather conditions" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CancelDeliveryModal({
  isOpen,
  orderNumber,
  restaurantPhone = "+91 98765 43210",
  isSubmitting = false,
  onConfirm,
  onClose,
}: CancelDeliveryModalProps) {
  const [selected, setSelected] = useState<string>("");
  const [touched, setTouched] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelected("");
      setTouched(false);
    }
  }, [isOpen]);

  const isValid = selected.length > 0;

  const handleConfirm = () => {
    setTouched(true);
    if (!isValid) return;
    onConfirm(selected);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom sheet (mobile-first) */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-[201] sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:w-full sm:max-w-md"
          >
            <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pt-4 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg leading-tight">
                      Decline Delivery
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5 font-medium">
                      {orderNumber} — restaurant will be notified
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <p className="text-slate-400 text-sm">
                  Choose why you're unable to take this delivery. The order will be
                  returned to the pool so another partner can pick it up.
                </p>

                {/* Reason chips */}
                <div className="grid grid-cols-1 gap-2">
                  {DECLINE_REASONS.map(({ emoji, label }) => (
                    <motion.button
                      key={label}
                      type="button"
                      onClick={() => { setSelected(label); setTouched(false); }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold text-left transition-all ${
                        selected === label
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      <span className="text-lg w-6 flex-shrink-0">{emoji}</span>
                      {label}
                    </motion.button>
                  ))}
                </div>

                {/* Validation error */}
                <AnimatePresence>
                  {touched && !isValid && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-xs font-medium flex items-center gap-1.5"
                    >
                      <AlertTriangle size={12} />
                      Please select a reason before declining.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Call restaurant */}
                <div className="pt-1 border-t border-white/10">
                  <a
                    href={`tel:${restaurantPhone.replace(/\s/g, "")}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-slate-400 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm font-semibold"
                  >
                    <Phone size={15} />
                    Call Restaurant
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-6 pb-safe flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Keep It
                </button>
                <motion.button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Declining...
                    </>
                  ) : (
                    "Decline Delivery"
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
