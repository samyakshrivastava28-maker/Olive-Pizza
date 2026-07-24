import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, ChevronDown } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CancelOrderReasonModalProps {
  isOpen: boolean;
  orderNumber: string;
  isSubmitting?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// ─── Preset Reasons ───────────────────────────────────────────────────────────

const PRESET_REASONS = [
  "Item(s) out of stock",
  "Restaurant closing soon",
  "Unable to fulfil delivery to this area",
  "Order placed by mistake (customer request)",
  "Customer unreachable",
  "Unusual order — potential fraud",
  "Kitchen capacity exceeded",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CancelOrderReasonModal({
  isOpen,
  orderNumber,
  isSubmitting = false,
  onConfirm,
  onClose,
}: CancelOrderReasonModalProps) {
  const [selected, setSelected] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [touched, setTouched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected("");
      setCustom("");
      setTouched(false);
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const reason = selected === "__custom__" ? custom.trim() : selected;
  const isValid = reason.length >= 3;

  const handleConfirm = () => {
    setTouched(true);
    if (!isValid) return;
    onConfirm(reason);
  };

  const handleSelectPreset = (r: string) => {
    setSelected(r);
    setShowDropdown(false);
    setTouched(false);
  };

  const handleSelectCustom = () => {
    setSelected("__custom__");
    setShowDropdown(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const displayLabel =
    selected === "__custom__"
      ? "Other reason..."
      : selected || "Select a reason";

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
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-4 bottom-4 z-[201] sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
          >
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg leading-tight">
                      Cancel Order
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5 font-medium">
                      {orderNumber} — this cannot be undone
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
              <div className="p-6 space-y-4">
                <p className="text-slate-400 text-sm">
                  Please provide a reason for cancellation. This will be shared
                  with the customer via push notification.
                </p>

                {/* Preset dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold border transition-all ${
                      touched && !isValid
                        ? "border-red-500/60 bg-red-500/5 text-red-400"
                        : selected
                        ? "border-primary-500/50 bg-primary-500/10 text-white"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronDown
                      size={16}
                      className={`flex-shrink-0 ml-2 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-10 top-full mt-2 left-0 right-0 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                      >
                        {PRESET_REASONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleSelectPreset(r)}
                            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5 ${
                              selected === r
                                ? "text-primary-400 bg-primary-500/10"
                                : "text-slate-200"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                        <div className="border-t border-white/10">
                          <button
                            type="button"
                            onClick={handleSelectCustom}
                            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5 ${
                              selected === "__custom__"
                                ? "text-primary-400 bg-primary-500/10"
                                : "text-slate-400"
                            }`}
                          >
                            ✏️ Other (write your own)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Custom text input */}
                <AnimatePresence>
                  {selected === "__custom__" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <textarea
                        ref={textareaRef}
                        rows={3}
                        maxLength={200}
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        placeholder="Describe the reason for cancellation..."
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-medium resize-none border outline-none transition-all bg-white/5 text-white placeholder-slate-500 ${
                          touched && !isValid
                            ? "border-red-500/60 focus:border-red-400"
                            : "border-white/10 focus:border-primary-500/60"
                        }`}
                      />
                      <p className="text-xs text-slate-500 mt-1 text-right">
                        {custom.length}/200
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      A cancellation reason is required.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Go Back
                </button>
                <motion.button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Cancelling...
                    </>
                  ) : (
                    "Confirm Cancellation"
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
