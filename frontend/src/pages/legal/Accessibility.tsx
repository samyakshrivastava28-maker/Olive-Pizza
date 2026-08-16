import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { Eye, Keyboard, Monitor, SunMoon, Smartphone, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';

export default function Accessibility() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "commitment", label: "1. Accessibility Commitment" },
    { id: "keyboard", label: "2. Keyboard Navigation" },
    { id: "screen-reader", label: "3. Screen Reader Support" },
    { id: "contrast", label: "4. Contrast & Visual Comfort" },
    { id: "mobile", label: "5. Mobile Accessibility" },
    { id: "contact", label: "6. Accessibility Feedback" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "WCAG 2.1 AA Compliant",
      description: "Designed to meet global digital accessibility and high-contrast benchmarks."
    },
    {
      icon: <Keyboard className="w-5 h-5" />,
      title: "Full Keyboard Navigation",
      description: "Complete checkout and menu browsing without requiring a mouse or touch."
    },
    {
      icon: <Monitor className="w-5 h-5" />,
      title: "Screen Reader Ready",
      description: "Comprehensive ARIA live regions and semantic structure for assistive tech."
    }
  ];

  return (
    <LegalPageLayout
      title="Accessibility Statement"
      badge="Digital Inclusion & Standards"
      description="Our ongoing commitment to ensuring Olive Pizza's digital experience is seamless and welcoming for everyone."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<Eye className="w-3.5 h-3.5" />}
      canonicalUrl="/accessibility"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Accessibility", url: "/accessibility" }
      ]}
    >
      {/* ── Section 1: Commitment ── */}
      <section id="commitment" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Accessibility Commitment</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Olive Pizza is committed to ensuring digital accessibility for people of all abilities. 
          We continually enhance the user experience across all devices and apply relevant accessibility standards 
          (including W3C WCAG 2.1 AA) to ensure our digital dining experience is universally inclusive.
        </p>
      </section>

      {/* ── Section 2: Keyboard Navigation ── */}
      <section id="keyboard" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Keyboard Navigation</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our website and web application are fully navigable using keyboard controls. 
          All interactive elements—including menu category selection, quantity buttons, modal dialogs, and checkout fields—feature 
          prominent focus rings, logical tab indices, and standard keyboard shortcuts (Enter / Space / Esc).
        </p>
      </section>

      {/* ── Section 3: Screen Reader Support ── */}
      <section id="screen-reader" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Screen Reader Support</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We build with semantic HTML5 elements to ensure compatibility with NVDA, JAWS, VoiceOver, and TalkBack. 
          Food images contain descriptive alternative text, form controls feature associated labels, and dynamic events 
          (such as live driver GPS updates and cart counter increments) use ARIA live regions to notify assistive technologies.
        </p>
      </section>

      {/* ── Section 4: Contrast & Colors ── */}
      <section id="contrast" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Contrast & Visual Comfort</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our typography system adheres to WCAG AA contrast standards (minimum 4.5:1 ratio for normal text). 
          We provide high visual distinction between buttons, links, and background canvases, alongside full support 
          for OS-level Dark Mode to reduce ocular fatigue.
        </p>
      </section>

      {/* ── Section 5: Mobile Accessibility ── */}
      <section id="mobile" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Mobile Accessibility</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our responsive website and Android app feature minimum 44×44px touch targets, fluid pinch-to-zoom support without horizontal breakage, 
          and dynamic font scaling according to user system settings.
        </p>
      </section>

      {/* ── Section 6: Contact Feedback ── */}
      <section id="contact" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Accessibility Feedback & Contact</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We welcome your feedback on the accessibility of Olive Pizza. If you encounter any accessibility barrier, please reach out to our team:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <Mail className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="text-xs text-slate-400">Email</div>
            <a href="mailto:accessibility@olivepizza.com" className="text-xs font-bold text-white hover:text-emerald-400 transition-colors">
              accessibility@olivepizza.com
            </a>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <Phone className="w-4 h-4 text-amber-400 mb-2" />
            <div className="text-xs text-slate-400">Phone</div>
            <span className="text-xs font-bold text-white">+1 (555) 123-4567</span>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <MapPin className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="text-xs text-slate-400">Address</div>
            <span className="text-xs font-bold text-white">123 Pizza Street, Foodville, NY 10001</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 pt-2">
          We aim to respond to accessibility feedback within 2 business days.
        </p>
      </section>
    </LegalPageLayout>
  );
}
