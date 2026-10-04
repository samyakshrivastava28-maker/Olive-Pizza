import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, ShieldCheck } from 'lucide-react';
import { SimplifiedSectionSchema } from '../../../types/PageSchema';

interface DeliveryAreaSectionProps {
  config: SimplifiedSectionSchema['config'];
}

export default function DeliveryAreaSection({ config }: DeliveryAreaSectionProps) {
  const headline = config?.headline || 'Delivering Across Rajnandgaon';
  const subtitle = config?.subtitle || 'Average delivery time 22 mins. Real-time GPS rider tracking on every order.';

  const zones = [
    { name: 'City Center & G.E. Road', time: '15-20 min', status: 'Active' },
    { name: 'Nandgaon Railway Station Area', time: '20-25 min', status: 'Active' },
    { name: 'Basantpur & Surrounding', time: '20-25 min', status: 'Active' },
    { name: 'Kailash Nagar & Shankar Nagar', time: '25-30 min', status: 'Active' },
  ];

  return (
    <section className="px-4 py-8 max-w-6xl mx-auto w-full">
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-black border border-emerald-500/25 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Delivery Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {headline}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {subtitle}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Delivery Speed</div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">Under 30 Mins</div>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Live Tracking</div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">GPS Synchronized</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Active Delivery Sectors
            </div>
            {zones.map((zone, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-xs sm:text-sm text-white">{zone.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">{zone.time}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {zone.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
