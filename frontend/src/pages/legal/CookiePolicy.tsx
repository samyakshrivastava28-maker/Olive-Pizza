import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { Cookie, CheckCircle, ShieldCheck, BarChart3, Sliders, Megaphone, Settings } from 'lucide-react';

export default function CookiePolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "what-are", label: "1. What Cookies Are" },
    { id: "essential", label: "2. Essential Cookies" },
    { id: "analytics", label: "3. Analytics & Performance" },
    { id: "functional", label: "4. Functional & Personalization" },
    { id: "marketing", label: "5. Marketing Cookies" },
    { id: "managing", label: "6. Managing Your Cookies" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Essential First",
      description: "We only use cookies necessary for secure authentication, cart, and app functionality."
    },
    {
      icon: <Sliders className="w-5 h-5" />,
      title: "AI Taste Personalization",
      description: "Functional cookies remember your flavor preferences and dietary filters."
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: "User Browser Controls",
      description: "You have complete freedom to configure or clear cookies in your browser settings."
    }
  ];

  return (
    <LegalPageLayout
      title="Cookie Policy"
      badge="Cookies & Tracking Technologies"
      description="Understanding how and why Olive Pizza uses cookies and local storage to deliver a fast, secure, and personalized ordering experience."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<Cookie className="w-3.5 h-3.5" />}
      canonicalUrl="/cookie-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Cookie Policy", url: "/cookie-policy" }
      ]}
    >
      {/* ── Section 1: What Cookies Are ── */}
      <section id="what-are" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">What Cookies Are</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Cookies are small text files and client-side data tokens stored on your computer or mobile device when you access a web application. 
          They are widely used to make web applications run efficiently, maintain secure sessions, and remember your personalized settings 
          (such as keeping you logged into your customer profile and remembering your custom pizza toppings in your cart).
        </p>
      </section>

      {/* ── Section 2: Essential Cookies ── */}
      <section id="essential" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Essential Cookies</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          These cookies are strictly required to operate the core platform, process payments, and ensure account security. 
          Because these cookies are essential to deliver the application, they cannot be disabled without breaking core functionality.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-xs font-bold text-emerald-400 block mb-1">Authentication</span>
            <p className="text-xs text-slate-300">Managed via Firebase to keep you securely signed in across app reloads.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-xs font-bold text-amber-400 block mb-1">Security & CSRF</span>
            <p className="text-xs text-slate-300">Protects your account against malicious script attacks and unauthorized requests.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-xs font-bold text-emerald-400 block mb-1">Cart Management</span>
            <p className="text-xs text-slate-300">Preserves items, customizations, and active coupons while you browse the menu.</p>
          </div>
        </div>
      </section>

      {/* ── Section 3: Analytics Cookies ── */}
      <section id="analytics" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Analytics & Performance Cookies</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          These cookies collect aggregated, anonymized metrics to help us understand app performance, identify load bottlenecks, 
          and measure order completion flows. This telemetry assists our engineering team in optimizing load speeds and responsive UX.
        </p>
      </section>

      {/* ── Section 4: Functional Cookies ── */}
      <section id="functional" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Functional & Personalization Cookies</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          These cookies enable enhanced personalization features on our platform, such as remembering your favorite delivery addresses, 
          dietary preferences (e.g., pure vegetarian, spice levels), and powering AI-assisted menu recommendations tailored to your taste profile.
        </p>
      </section>

      {/* ── Section 5: Marketing Cookies ── */}
      <section id="marketing" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Marketing & Promotional Cookies</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We may occasionally use promotional cookies to display seasonal combo offers and prevent the same announcement popup 
          from repeatedly appearing after you have already dismissed it.
        </p>
      </section>

      {/* ── Section 6: Managing Cookies ── */}
      <section id="managing" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Managing Your Cookies</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          You have the right to accept or decline non-essential cookies. You can adjust your browser settings at any time to block 
          or delete stored cookies. Please note that disabling essential cookies may impact your ability to log in or complete checkout.
        </p>
        <p className="text-xs text-slate-400 pt-2">
          To manage cookie preferences on your device, consult the settings page of your browser (Google Chrome, Apple Safari, Mozilla Firefox, or Microsoft Edge).
        </p>
      </section>
    </LegalPageLayout>
  );
}
