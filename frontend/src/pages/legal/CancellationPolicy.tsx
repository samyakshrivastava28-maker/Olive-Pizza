import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { XCircle, CheckCircle2, Clock, Utensils, Truck, AlertTriangle, Phone, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';

export default function CancellationPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "before-cooking", label: "1. Before Cooking (100% Refund)" },
    { id: "during-cooking", label: "2. During Cooking Phase" },
    { id: "out-for-delivery", label: "3. Out for Delivery" },
    { id: "scheduled-orders", label: "4. Scheduled Orders" },
    { id: "restaurant-cancellation", label: "5. Restaurant Cancellations" },
    { id: "customer-cancellation", label: "6. How to Cancel" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "100% Pre-Prep Grace Period",
      description: "Full immediate refund when cancelled before the kitchen begins cooking."
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Scheduled Order Flexibility",
      description: "Cancel scheduled orders free of charge up to 2 hours before preparation."
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Automatic Kitchen Reversals",
      description: "If an order is cancelled by the restaurant, 100% is refunded immediately."
    }
  ];

  return (
    <LegalPageLayout
      title="Cancellation Policy"
      badge="Order Cancellation & Flexibility"
      description="Our transparent cancellation guidelines, designed to balance customer flexibility with our commitment to fresh food preparation."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<XCircle className="w-3.5 h-3.5" />}
      canonicalUrl="/cancellation-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Cancellation Policy", url: "/cancellation-policy" }
      ]}
    >
      {/* ── Visual Lifecycle Matrix Card ── */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#121418] to-amber-950/30 border border-emerald-500/20">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Cancellation Eligibility Lifecycle</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[11px] font-bold uppercase text-emerald-400 block mb-1">Status: Pending</span>
            <div className="text-sm font-black text-white">100% Full Refund</div>
            <p className="text-[10px] text-slate-300 mt-1">Before kitchen begins cooking</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-[11px] font-bold uppercase text-amber-400 block mb-1">Status: Cooking</span>
            <div className="text-sm font-black text-white">Non-Refundable</div>
            <p className="text-[10px] text-slate-300 mt-1">Dough & ingredients allocated</p>
          </div>
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
            <span className="text-[11px] font-bold uppercase text-red-400 block mb-1">Status: On The Way</span>
            <div className="text-sm font-black text-white">No Cancellation</div>
            <p className="text-[10px] text-slate-300 mt-1">Driver active with live GPS</p>
          </div>
        </div>
      </div>

      {/* ── Section 1: Before Cooking ── */}
      <section id="before-cooking" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Cancellation Before Cooking</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Because we prioritize speed, orders are sent to the kitchen almost immediately. However, there is a short grace period. 
          If you cancel your order while its status is "Pending" or before the kitchen officially accepts it and begins preparation, 
          you will receive a <strong>100% full refund</strong>.
        </p>
      </section>

      {/* ── Section 2: During Cooking ── */}
      <section id="during-cooking" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Cancellation During Cooking</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Once our chefs begin preparing your pizza (status: "Cooking"), fresh ingredients are consumed and the food is customized to your request. 
          At this stage, we cannot offer a full refund. Cancellations made during the cooking phase are generally not accepted, or may be subject to a 100% cancellation fee.
        </p>
      </section>

      {/* ── Section 3: Out for Delivery ── */}
      <section id="out-for-delivery" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Out for Delivery</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Orders that have left the restaurant and are "Out for Delivery" with our live GPS tracking active cannot be cancelled under any circumstances. 
          If you refuse the delivery at your door, you will still be charged the full amount for the order and the delivery fee.
        </p>
      </section>

      {/* ── Section 4: Scheduled Orders ── */}
      <section id="scheduled-orders" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Scheduled Orders</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          For orders scheduled in advance for a future date or time, you may cancel the order free of charge up to <strong>2 hours</strong> before the scheduled preparation time. 
          Cancellations made within the 2-hour window are subject to the standard cooking-phase rules.
        </p>
      </section>

      {/* ── Section 5: Restaurant Cancellations ── */}
      <section id="restaurant-cancellation" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Restaurant Cancellations</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Olive Pizza reserves the right to cancel an order under rare operational constraints:
        </p>
        <ul className="space-y-2 text-sm md:text-base text-slate-300">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Unavailability of a specific fresh ingredient necessary for your handcrafted pizza.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Delivery location identified as unsafe or inaccessible for our delivery fleet.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Fraudulent payment detection or failed authentication.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Severe monsoon weather conditions forcing temporary suspension of delivery operations.</span>
          </li>
        </ul>
        <p className="text-xs text-emerald-400 font-semibold pt-1">
          If we cancel your order, you are notified immediately via Push Notification and Email, and a 100% full refund is issued automatically.
        </p>
      </section>

      {/* ── Section 6: How to Cancel ── */}
      <section id="customer-cancellation" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">How to Cancel</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          To cancel an eligible order, navigate to your <strong>Customer Dashboard</strong>, select the active order from your Order History, 
          and click the "Cancel Order" button. If the button is disabled, the kitchen preparation has begun. For urgent inquiries, 
          reach the restaurant directly via the phone number provided on your live order tracking screen.
        </p>
      </section>
    </LegalPageLayout>
  );
}
