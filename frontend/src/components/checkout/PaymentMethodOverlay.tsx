import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DevicePaymentAppsService, DevicePaymentApp } from '../../services/DevicePaymentAppsService';

interface PaymentMethodOverlayProps {
  onClose: () => void;
  onSelect: (method: string) => void;
  total: number;
}

export default function PaymentMethodOverlay({ onClose, onSelect, total }: PaymentMethodOverlayProps) {
  const [upiApps, setUpiApps] = useState<DevicePaymentApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    let active = true;
    const detectApps = async () => {
      try {
        const apps = await DevicePaymentAppsService.getAvailablePaymentApps();
        if (active) {
          setUpiApps(apps);
        }
      } catch (err) {
        console.warn('[PaymentMethodOverlay] App detection notice:', err);
      } finally {
        if (active) setLoadingApps(false);
      }
    };
    detectApps();
    return () => { active = false; };
  }, []);

  const otherMethods = [
    { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { id: 'cod', name: 'Cash on Delivery', desc: 'Pay cash or scan QR at doorstep', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0"
    >
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-safe sm:pb-6 shadow-2xl text-slate-900 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Payment Method</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select how you want to pay <span className="font-bold text-primary-700">₹{total}</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device UPI Payment Options */}
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary-600" /> UPI & Online Apps
            </p>
            <div className="space-y-2">
              {upiApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onSelect(app.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98] group cursor-pointer text-left ${
                    app.isInstalled
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                      : 'bg-[#FAF8F5] border-slate-200 hover:border-primary-500 hover:bg-primary-50/20'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl border ${app.bgLight} transition-colors`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 group-hover:text-primary-800 transition-colors">
                          {app.name}
                        </p>
                        {app.isInstalled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{app.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cards & Cash */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary-600" /> Cards & Cash
            </p>
            <div className="space-y-2">
              {otherMethods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect(m.id)}
                    className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAF8F5] border border-slate-200 hover:border-primary-500 hover:bg-primary-50/20 transition-all active:scale-[0.98] group cursor-pointer text-left"
                  >
                    <div className={`p-2.5 rounded-xl border ${m.bg} ${m.color} transition-colors`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-slate-900 group-hover:text-primary-800 transition-colors">
                        {m.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
           <ShieldCheck className="w-4 h-4 text-primary-600" /> 100% Secure & Encrypted Payments
        </div>
      </motion.div>
    </motion.div>
  );
}
