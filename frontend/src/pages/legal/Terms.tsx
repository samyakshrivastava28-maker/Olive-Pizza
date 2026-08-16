import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { FileText, CheckCircle2, AlertCircle, Scale, ShieldAlert, Sparkles, Gift, Clock, ShoppingCart, Truck, CreditCard } from 'lucide-react';
import { Link } from 'react-router';

export default function Terms() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "acceptance", label: "1. Acceptance of Terms" },
    { id: "user-responsibilities", label: "2. User Conduct & Accounts" },
    { id: "ordering-rules", label: "3. Ordering Rules" },
    { id: "pricing-payments", label: "4. Pricing & Payments" },
    { id: "delivery-rules", label: "5. Delivery Rules & Delays" },
    { id: "scheduled-orders", label: "6. Scheduled Orders" },
    { id: "cancellations", label: "7. Cancellation & Refunds" },
    { id: "loyalty", label: "8. Coupons & Loyalty Rewards" },
    { id: "ai-recommendations", label: "9. AI Recommendations" },
    { id: "intellectual-property", label: "10. Intellectual Property" },
    { id: "liability", label: "11. Limitation of Liability" },
    { id: "force-majeure", label: "12. Force Majeure" },
    { id: "governing-law", label: "13. Governing Law" },
    { id: "contact", label: "14. Contact Information" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Fresh Preparation Standard",
      description: "All pizzas are handcrafted fresh upon kitchen order confirmation."
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Grace Period Cancellations",
      description: "Full refunds are available before the kitchen begins active cooking."
    },
    {
      icon: <Scale className="w-5 h-5" />,
      title: "Transparent Pricing",
      description: "All taxes, fees, and discounts are explicitly shown prior to payment."
    }
  ];

  return (
    <LegalPageLayout
      title="Terms & Conditions"
      badge="Terms of Service & Usage"
      description="The clear rules, policies, and mutual agreements that govern your orders and use of Olive Pizza."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<Scale className="w-3.5 h-3.5" />}
      canonicalUrl="/terms"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Terms & Conditions", url: "/terms" }
      ]}
    >
      {/* ── Section 1: Acceptance ── */}
      <section id="acceptance" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Acceptance of Terms</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          By downloading, accessing, browsing, or placing an order through the Olive Pizza application and website, 
          you agree to be bound by these Terms & Conditions. If you do not agree to all stated terms, please discontinue use of our platform.
        </p>
      </section>

      {/* ── Section 2: User Responsibilities ── */}
      <section id="user-responsibilities" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">User Responsibilities & Customer Conduct</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          As a registered user and customer on our platform, you agree to:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <span className="text-xs font-bold text-emerald-400 block mb-1">Accurate Details</span>
            <p className="text-xs text-slate-300">Provide accurate and up-to-date delivery addresses and phone numbers during checkout.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <span className="text-xs font-bold text-amber-400 block mb-1">Account Security</span>
            <p className="text-xs text-slate-300">Maintain the confidentiality of your login credentials and OTP verifications.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <span className="text-xs font-bold text-emerald-400 block mb-1">Respectful Conduct</span>
            <p className="text-xs text-slate-300">Treat restaurant personnel and delivery partners with dignity. Abusive behavior results in termination.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <span className="text-xs font-bold text-amber-400 block mb-1">Availability for Handover</span>
            <p className="text-xs text-slate-300">Ensure an authorized individual is present to receive the delivery at the designated address.</p>
          </div>
        </div>
      </section>

      {/* ── Section 3: Ordering Rules ── */}
      <section id="ordering-rules" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Ordering Rules</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          All orders are subject to acceptance and kitchen ingredient availability. Once an order is accepted by our kitchen, 
          it immediately enters the artisan preparation queue. We reserve the right to refuse service or cancel orders under valid operational constraints.
        </p>
      </section>

      {/* ── Section 4: Pricing & Payments ── */}
      <section id="pricing-payments" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Pricing & Payments</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Menu prices are subject to periodic updates without prior notice. We support online digital payments, UPI, debit/credit cards, 
          and Cash on Delivery (COD). By submitting payment credentials, you confirm that you are legally authorized to utilize the chosen method.
        </p>
      </section>

      {/* ── Section 5: Delivery Rules & Delays ── */}
      <section id="delivery-rules" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivery Rules & Delays</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We strive for rapid delivery backed by real-time GPS tracking. While our estimated arrival times are dynamically calculated, 
          adverse weather, heavy traffic, or peak kitchen hours may occasionally cause delays. Our drivers may capture a digital photo proof upon delivery completion.
        </p>
      </section>

      {/* ── Section 6: Scheduled Orders ── */}
      <section id="scheduled-orders" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Scheduled Orders</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          You may schedule orders for future delivery slots. Scheduled orders may be modified or cancelled free of charge 
          up to <strong>2 hours</strong> prior to the scheduled kitchen preparation window.
        </p>
      </section>

      {/* ── Section 7: Cancellation & Refunds ── */}
      <section id="cancellations" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">7</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Cancellation & Refund Policy</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Because our pizzas are prepared fresh to order, cancellations must be made prior to the cooking phase. 
          For granular refund eligibility timelines and missing-item compensation, consult our specific policy documents:
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to="/cancellation-policy"
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs font-bold text-white transition-all"
          >
            Cancellation Policy →
          </Link>
          <Link
            to="/refund-policy"
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs font-bold text-white transition-all"
          >
            Refund Policy →
          </Link>
        </div>
      </section>

      {/* ── Section 8: Coupons & Loyalty ── */}
      <section id="loyalty" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">8</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Coupons & Loyalty Rewards</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Promotional coupons and loyalty points possess no cash surrender value and cannot be redeemed for fiat currency. 
          We reserve the right to void coupons or adjust loyalty balances if abuse, multi-account creation, or fraudulent activities are detected.
        </p>
      </section>

      {/* ── Section 9: AI Recommendations ── */}
      <section id="ai-recommendations" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">9</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">AI Recommendations</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our platform integrates AI assistance to recommend combos, pairings, and flavor profiles. While engineered for precision, 
          these suggestions are algorithmic and users are encouraged to verify dietary tags (vegetarian, allergen details) before ordering.
        </p>
      </section>

      {/* ── Section 10: Intellectual Property ── */}
      <section id="intellectual-property" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">10</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Intellectual Property</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          All proprietary trademarks, graphics, UI design, recipe descriptions, branding assets, and software code are the intellectual property 
          of Olive Pizza and are legally protected under applicable copyright and intellectual property legislation.
        </p>
      </section>

      {/* ── Section 11: Liability ── */}
      <section id="liability" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">11</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Limitation of Liability</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          To the maximum extent permitted by law, Olive Pizza and its officers shall not be held liable for indirect, incidental, 
          or consequential damages arising from the use or inability to use our services, beyond the order transaction value.
        </p>
      </section>

      {/* ── Section 12: Force Majeure ── */}
      <section id="force-majeure" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">12</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Force Majeure</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We shall not be liable for delayed fulfillment or temporary service outages caused by events outside our reasonable control, 
          such as extreme storms, governmental orders, power grid failures, or telecommunications disruptions.
        </p>
      </section>

      {/* ── Section 13: Governing Law ── */}
      <section id="governing-law" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">13</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Governing Law</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          These Terms and all associated transactions shall be governed by and construed in accordance with the laws of the jurisdiction 
          in which Olive Pizza primarily operates, without regard to conflict of law principles.
        </p>
      </section>

      {/* ── Section 14: Contact ── */}
      <section id="contact" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">14</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Contact Information</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          For legal inquiries, dispute resolutions, or contract notices, please write to our legal desk at:
        </p>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 inline-block">
          <span className="text-xs text-slate-400 block mb-1">Legal Department</span>
          <a href="mailto:legal@olivepizza.com" className="text-sm font-bold text-emerald-400 hover:underline">
            legal@olivepizza.com
          </a>
        </div>
      </section>
    </LegalPageLayout>
  );
}
