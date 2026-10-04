import React from 'react';
import { Phone, Clock, MapPin, Heart, ShieldCheck } from 'lucide-react';
import { SimplifiedSectionSchema } from '../../../types/PageSchema';

interface FooterSectionProps {
  config?: SimplifiedSectionSchema['config'];
}

export default function FooterSection({ config }: FooterSectionProps) {
  return (
    <footer className="mt-12 border-t border-slate-800/80 bg-[#070B08]/90 text-slate-400 py-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <div className="text-lg font-black text-white flex items-center gap-2 mb-2">
            <span className="text-xl">🍕</span>
            <span>OLIVE PIZZA</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-4">
            Artisan wood-fired pizzas, handcrafted dough, 100% pure mozzarella, and authentic Italian sauces delivered piping hot.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            100% Pure Veg Kitchen
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-black text-white uppercase tracking-wider">Store & Service</div>
          <div className="flex items-start gap-2.5 text-xs">
            <MapPin className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
            <span>G.E. Road, Near Bus Stand, Rajnandgaon, Chhattisgarh 491441</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <Clock className="w-4 h-4 text-primary-400 shrink-0" />
            <span>Open Daily: 11:00 AM – 11:00 PM</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <Phone className="w-4 h-4 text-primary-400 shrink-0" />
            <span>Order Helpline: +91 91791 23456</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-black text-white uppercase tracking-wider">Quality & Safety</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Strict temperature controls, contactless rider dispatch, and FSSAI certified hygiene standards across kitchen and prep counters.
          </p>
          <div className="text-[11px] text-slate-500">
            FSSAI Lic. No. 20521085000123
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          © {new Date().getFullYear()} Olive Pizza. Handcrafted with authentic stone oven craft.
        </div>
        <div className="flex items-center gap-1">
          <span>Made for foodies with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
          <span>in Rajnandgaon</span>
        </div>
      </div>
    </footer>
  );
}
