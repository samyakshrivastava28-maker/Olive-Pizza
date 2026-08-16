import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { Truck, MapPin, Navigation, Clock, Calendar, ShieldCheck, Camera, UserX, Award } from 'lucide-react';

export default function DeliveryPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "areas", label: "1. Delivery Areas & Radius" },
    { id: "charges", label: "2. Delivery Charges" },
    { id: "tracking", label: "3. Live Order Tracking" },
    { id: "times", label: "4. Estimated Delivery Time" },
    { id: "scheduled", label: "5. Scheduled Delivery" },
    { id: "no-contact", label: "6. No Contact Delivery" },
    { id: "proof", label: "7. Delivery Photo Proof" },
    { id: "failed", label: "8. Failed Delivery Attempts" },
    { id: "partners", label: "9. Fleet Responsibilities" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <Navigation className="w-5 h-5" />,
      title: "Real-Time GPS Tracking",
      description: "Follow your driver live on an interactive map from oven to doorstep."
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "Insulated Thermal Bags",
      description: "Piping-hot delivery guaranteed with high-grade temperature retention packs."
    },
    {
      icon: <Camera className="w-5 h-5" />,
      title: "Digital Photo Proof",
      description: "Secure delivery verification photos attached to every order record."
    }
  ];

  return (
    <LegalPageLayout
      title="Shipping & Delivery Policy"
      badge="Delivery Logistics & Standards"
      description="Everything you need to know about how we deliver our artisan pizzas hot, fresh, and on time to your doorstep."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<Truck className="w-3.5 h-3.5" />}
      canonicalUrl="/delivery-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Delivery Policy", url: "/delivery-policy" }
      ]}
    >
      {/* ── Section 1: Delivery Areas ── */}
      <section id="areas" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivery Areas & Radius</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We deliver within a set radius surrounding our restaurant kitchens. 
          When you enter your address during checkout or onboarding, our system automatically validates your exact GPS coordinates 
          to verify if you fall within our active delivery boundaries. If you reside outside our maximum delivery radius, 
          you may place an order for Takeaway / Store Pickup.
        </p>
      </section>

      {/* ── Section 2: Delivery Charges ── */}
      <section id="charges" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivery Charges</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Delivery charges are calculated dynamically based on your precise driving distance from the kitchen and current weather conditions. 
          The final delivery fee is always displayed transparently on the checkout summary screen before you confirm payment.
        </p>
      </section>

      {/* ── Section 3: Live GPS Tracking ── */}
      <section id="tracking" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Live Order Tracking</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Once your order leaves our kitchen, you gain access to our Live GPS Order Tracking page. 
          You can monitor your delivery partner's real-time position on an interactive map, view estimated arrival updates, 
          and directly call your driver when they arrive nearby.
        </p>
      </section>

      {/* ── Section 4: Estimated Delivery Time ── */}
      <section id="times" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Estimated Delivery Time</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our intelligent dispatch engine calculates an estimated delivery window when you place your order, factoring in active oven load, 
          handcrafted prep time, and live traffic data. Please note that severe monsoon weather, road diversions, or extreme peak kitchen volume may slightly adjust transit times.
        </p>
      </section>

      {/* ── Section 5: Scheduled Delivery ── */}
      <section id="scheduled" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Scheduled Delivery</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Hosting an event or dinner party? Use our Scheduled Delivery option to pre-order days in advance. 
          Select your target delivery date and time slot at checkout. Our kitchen schedules dough proofing and baking so your food arrives freshly baked right on time.
        </p>
      </section>

      {/* ── Section 6: No Contact Delivery ── */}
      <section id="no-contact" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">No Contact Delivery</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          For your comfort and hygiene, we offer a dedicated "No Contact Delivery" option. 
          When enabled, our delivery partner places your pizza box safely at your doorstep on a sanitized surface, rings the bell or knocks, 
          and maintains a courteous safe distance during handover.
        </p>
      </section>

      {/* ── Section 7: Delivery Photo Proof ── */}
      <section id="proof" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">7</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivery Photo Proof</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          To ensure transparency and accountability (especially for No Contact deliveries or unattended receptions), 
          our delivery partners capture a geotagged digital photograph of the package at your doorstep. 
          This photo proof is securely stored in our cloud storage and visible on your completed order receipt.
        </p>
      </section>

      {/* ── Section 8: Failed Delivery Attempts ── */}
      <section id="failed" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">8</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Failed Delivery Attempts</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our delivery partners will attempt to contact you via telephone if they encounter difficulties locating your premises. 
          If our driver waits for more than <strong>10 minutes</strong> and you remain unreachable, the delivery will be logged as Failed. 
          For strict food safety and hygiene regulations, prepared food cannot be restocked or returned to the kitchen and will be responsibly disposed of without refund eligibility.
        </p>
      </section>

      {/* ── Section 9: Partner Responsibilities ── */}
      <section id="partners" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">9</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivery Fleet & Partner Standards</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our delivery fleet consists of verified, background-checked professionals equipped with specialized insulated pizza bags. 
          They are trained in food safety protocols and respectful customer service. 
          Should you experience any service discrepancy, please report it immediately through your Customer Dashboard or support desk.
        </p>
      </section>
    </LegalPageLayout>
  );
}
