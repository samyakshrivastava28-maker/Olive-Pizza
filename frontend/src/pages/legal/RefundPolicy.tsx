import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, CreditCard, HelpCircle, Camera, Utensils, Mail } from 'lucide-react';
import { Link } from 'react-router';

export default function RefundPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "eligible", label: "1. Eligible Refunds" },
    { id: "non-refundable", label: "2. Non-Refundable Situations" },
    { id: "cancel-before", label: "3. Cancel Before Preparation" },
    { id: "cancel-during", label: "4. Cancel During Preparation" },
    { id: "delivered", label: "5. Delivered Orders" },
    { id: "wrong-missing", label: "6. Wrong or Missing Items" },
    { id: "damaged", label: "7. Damaged Food" },
    { id: "delays", label: "8. Delivery Delays" },
    { id: "payments", label: "9. Duplicate & Failed Charges" },
    { id: "contact", label: "10. Contact Support" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <CheckCircle className="w-5 h-5" />,
      title: "100% Grace Cancellation",
      description: "Full refund issued if cancelled before kitchen preparation starts."
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Instant Replacement",
      description: "Priority redelivery or direct refund for any wrong or missing items."
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: "Automated Reversals",
      description: "Duplicate bank charges automatically refunded within 3-5 business days."
    }
  ];

  return (
    <LegalPageLayout
      title="Refund Policy"
      badge="Customer Protection & Refunds"
      description="Clear, fair, and transparent guidelines on how refunds and replacements are processed for your orders."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<RefreshCw className="w-3.5 h-3.5" />}
      canonicalUrl="/refund-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Refund Policy", url: "/refund-policy" }
      ]}
    >
      {/* ── Section 1: Eligible Refunds ── */}
      <section id="eligible" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Eligible Refunds</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We take immense pride in our artisan pizzas and want you to be completely satisfied. You are eligible for a full or partial refund if:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-200">You received an incorrect item or wrong order.</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-200">Items or paid extras were missing from your package.</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-200">The food arrived physically damaged or in unacceptable condition.</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-200">Your order was cancelled before kitchen preparation began.</span>
          </div>
        </div>
      </section>

      {/* ── Section 2: Non-refundable ── */}
      <section id="non-refundable" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Non-Refundable Circumstances</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Refunds cannot be issued under the following circumstances:
        </p>
        <div className="space-y-2 pt-1">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-300">An incorrect or incomplete delivery address was entered by the customer.</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-300">Customer remained unreachable by phone for &gt;10 minutes upon driver arrival.</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-300">Change of mind after the order was already baked or dispatched.</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-300">Quality feedback or complaints reported more than 24 hours after delivery.</span>
          </div>
        </div>
      </section>

      {/* ── Section 3: Cancel Before Cooking ── */}
      <section id="cancel-before" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Cancellation Before Preparation</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          If you cancel your order within the grace period (before our kitchen accepts and begins cooking), you will receive a <strong>100% full refund</strong>. 
          You can initiate this cancellation directly from the Live Order Tracking screen in your Customer Dashboard.
        </p>
      </section>

      {/* ── Section 4: Cancel During Cooking ── */}
      <section id="cancel-during" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Cancellation During Preparation</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Once our chefs begin crafting your pizza (status: "Cooking"), ingredients are allocated and the food is customized to your order. 
          Cancellations at this stage may incur a 100% charge, or a partial courtesy credit at the sole discretion of the restaurant manager.
        </p>
      </section>

      {/* ── Section 5: Delivered Orders ── */}
      <section id="delivered" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivered Orders</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Orders confirmed as delivered with accompanying digital photo proof cannot be cancelled. 
          If there is any genuine packaging or quality defect, contact support promptly with photographic evidence.
        </p>
      </section>

      {/* ── Section 6: Wrong or Missing Items ── */}
      <section id="wrong-missing" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Wrong or Missing Items</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          If an item is missing or you received an incorrect pizza, report it immediately via the dashboard or support desk. 
          We will promptly send the missing/correct item via priority dispatch or process an immediate partial refund to your original payment method.
        </p>
      </section>

      {/* ── Section 7: Damaged Food ── */}
      <section id="damaged" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">7</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Damaged Food</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          If your pizza arrives damaged or crushed due to transport transit, take a quick photo of the box and contents. 
          We will issue an immediate fresh replacement or full refund with our deepest apologies.
        </p>
      </section>

      {/* ── Section 8: Delivery Delays ── */}
      <section id="delays" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">8</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Delivery Delays</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          While our lightning delivery strives for speed, severe weather or road accidents may occasionally delay transit. 
          If an order is exceptionally late (over 90 minutes past the estimated arrival time), contact us for direct compensation or a full refund.
        </p>
      </section>

      {/* ── Section 9: Duplicate Charges ── */}
      <section id="payments" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">9</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Duplicate & Failed Payments</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          If your account was billed twice due to an internet drop or payment gateway timeout, the duplicate charge will be automatically 
          refunded within <strong>3-5 business days</strong>. Failed debited transactions are reversed by your issuing bank within 7 business days.
        </p>
      </section>

      {/* ── Section 10: Contact Support ── */}
      <section id="contact" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">10</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Contact Support</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          To file a refund request, go to your <strong>Order History</strong> in your Customer Dashboard and select "Get Help", 
          or email us directly with your Order ID and photo attachments:
        </p>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
          <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-xs text-slate-400">Customer Support Email</div>
            <a href="mailto:support@olivepizza.com" className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
              support@olivepizza.com
            </a>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
