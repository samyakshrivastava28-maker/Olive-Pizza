import React from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Banknote, Wallet, Smartphone, ShieldCheck } from 'lucide-react';

export default function PaymentMethodOverlay({ onClose, onSelect, total }: any) {
  const methods = [
    { id: 'upi', name: 'UPI', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'wallet', name: 'Wallets', desc: 'Amazon Pay, Paytm', icon: Wallet, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'cash', name: 'Cash on Delivery', desc: 'Pay at your doorstep', icon: Banknote, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0"
    >
      <motion.div 
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-safe sm:pb-6 shadow-2xl text-slate-900"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Payment Method</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select how you want to pay <span className="font-bold text-primary-700">₹{total}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {methods.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200 hover:border-primary-500 hover:bg-primary-50/30 transition-all active:scale-[0.98] group cursor-pointer text-left"
              >
                <div className="p-3 rounded-xl bg-primary-100 text-primary-700 group-hover:bg-primary-600 group-hover:text-champagne transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-slate-900 group-hover:text-primary-800 transition-colors">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
           <ShieldCheck className="w-4 h-4 text-primary-600" /> 100% Secure & Encrypted Payments
        </div>
      </motion.div>
    </motion.div>
  );
}
