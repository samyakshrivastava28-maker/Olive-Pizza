import React from "react";
import { motion } from "framer-motion";
import { Smartphone, Zap, QrCode, ShieldCheck, Download, Bot } from "lucide-react";
import { Link } from "react-router";

export default function AppDownloadSection() {
  return (
    <section className="relative py-16 md:py-24 z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className="relative rounded-3xl p-8 sm:p-12 md:p-16 backdrop-blur-2xl border border-white/10 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.7) 100%)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Ambient Glow Disk */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-500/20 to-amber-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Smartphone className="w-4 h-4" /> Official Mobile App & AI
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                Order Faster With <br />
                <span className="bg-gradient-to-r from-primary-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Olive Pizza Mobile App
                </span>
              </h2>

              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 font-medium">
                Experience ultra-fast 1-click checkout, live order GPS tracker, exclusive app-only coupons, and instant ordering through our AI Concierge.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3 mb-8">
                {["⚡ Sub-150ms Instant Checkout", "🛰️ Live Driver GPS Tracking", "🤖 AI Voice Assistant", "🎟️ Exclusive Coupons"].map(
                  (feature) => (
                    <div
                      key={feature}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-200"
                    >
                      {feature}
                    </div>
                  )
                )}
              </div>

              {/* CTA Buttons & QR */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/assistant"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-orange-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
                >
                  <Bot className="w-5 h-5" /> Launch AI Concierge
                </Link>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-slate-300 text-xs font-semibold">
                  <QrCode className="w-5 h-5 text-amber-400" /> Scan to Install (iOS / Android)
                </div>
              </div>
            </div>

            {/* Right Smartphone Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="w-64 sm:w-72 h-[480px] sm:h-[520px] rounded-[40px] border-4 border-white/20 bg-slate-950 shadow-2xl p-4 relative overflow-hidden flex flex-col justify-between">
                {/* Notch */}
                <div className="w-24 h-4 bg-white/10 rounded-full mx-auto mb-4" />

                {/* Mock Screen Content */}
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold">
                    🔥 Order Delivered in 24 Mins!
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                    <div className="w-full h-24 rounded-xl bg-slate-800 mb-2 overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&q=80"
                        alt="App"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-white font-bold text-xs">Truffle Mushroom Supreme</div>
                    <div className="text-slate-400 text-[10px]">Preparing in Wood-Fired Oven</div>
                  </div>
                </div>

                {/* Mobile Bottom Bar */}
                <div className="w-1/2 h-1 bg-white/30 rounded-full mx-auto" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
