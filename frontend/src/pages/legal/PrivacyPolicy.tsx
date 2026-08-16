import LegalPageLayout, { TocItem, HighlightCard } from '../../components/layout/LegalPageLayout';
import { Shield, Lock, Eye, Database, Server, UserCheck, Bell, Sparkles, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router';

export default function PrivacyPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc: TocItem[] = [
    { id: "introduction", label: "1. Introduction" },
    { id: "information-we-collect", label: "2. Information We Collect" },
    { id: "how-we-use", label: "3. How We Use Your Information" },
    { id: "cookies", label: "4. Cookies & Analytics" },
    { id: "third-party", label: "5. Third-Party Services" },
    { id: "data-security", label: "6. Data Security" },
    { id: "data-retention", label: "7. Data Retention" },
    { id: "customer-rights", label: "8. Customer Rights & Deletion" },
    { id: "childrens-privacy", label: "9. Children's Privacy" },
    { id: "policy-updates", label: "10. Policy Updates" },
    { id: "contact", label: "11. Contact Information" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Zero Third-Party Ad Selling",
      description: "We never monetize or sell your personal data to advertising brokers."
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "End-to-End Encryption",
      description: "All transactions and customer profiles are secured with 256-bit SSL encryption."
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      title: "Full Customer Control",
      description: "Request an export or permanent deletion of your data at any time."
    }
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      badge="Data Protection & Privacy"
      description="Learn how Olive Pizza collects, uses, and protects your personal data with transparency and strict security."
      lastUpdated={lastUpdated}
      toc={toc}
      highlights={highlights}
      icon={<Lock className="w-3.5 h-3.5" />}
      canonicalUrl="/privacy-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Privacy Policy", url: "/privacy-policy" }
      ]}
    >
      {/* ── Section 1: Introduction ── */}
      <section id="introduction" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Introduction</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          At Olive Pizza, we respect your privacy and are committed to protecting your personal data. 
          This Privacy Policy informs you as to how we look after your personal data when you visit our website 
          or mobile application and outlines your privacy rights and how the law protects you.
        </p>
      </section>

      {/* ── Section 2: Information We Collect ── */}
      <section id="information-we-collect" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Information We Collect</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We may collect, use, store, and transfer different kinds of personal data about you, grouped as follows:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Personal Information
            </h3>
            <p className="text-xs text-slate-300">Includes first name, last name, username, or similar identifier.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Contact Information
            </h3>
            <p className="text-xs text-slate-300">Includes delivery address, email address, and telephone numbers.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2">
              <Database className="w-4 h-4" /> Order Information
            </h3>
            <p className="text-xs text-slate-300">Includes details about payments, past orders, and customized food preferences.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-2">
              <Server className="w-4 h-4" /> Device & Technical Info
            </h3>
            <p className="text-xs text-slate-300">Includes IP address, login data, browser type/version, time zone, OS, and platform.</p>
          </div>
        </div>
      </section>

      {/* ── Section 3: How We Use Information ── */}
      <section id="how-we-use" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">How We Use Your Information</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We use your data strictly to provide the best possible artisan pizza dining and delivery experience. Specific uses include:
        </p>
        <ul className="space-y-2.5 text-sm md:text-base text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Processing, baking, and delivering your order (including live GPS tracking).</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Managing your loyalty reward points, active coupons, and personalized menu pairings.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Sending critical transactional SMS, emails, and push notifications regarding your order lifecycle.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span>Continuous improvement of our application stability, culinary recipes, and customer relationships.</span>
          </li>
        </ul>
      </section>

      {/* ── Section 4: Cookies & Analytics ── */}
      <section id="cookies" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Cookies & Analytics</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We use cookies to distinguish you from other users of our platform. This helps us provide a seamless experience 
          (such as persisting your cart items and authentication token) and allows us to enhance site performance.
        </p>
        <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
          <span className="text-xs md:text-sm text-slate-300">
            For granular details on cookie categories and how to control preferences, view our full policy.
          </span>
          <Link
            to="/cookie-policy"
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors"
          >
            Cookie Policy →
          </Link>
        </div>
      </section>

      {/* ── Section 5: Third-Party Services ── */}
      <section id="third-party" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Third-Party Services</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We partner with vetted industry-standard infrastructure providers to operate securely:
        </p>
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <span className="font-bold text-white text-xs md:text-sm shrink-0 w-36">Google Services:</span>
            <span className="text-xs md:text-sm text-slate-300">Used for address validation, real-time road routing, and live driver map rendering.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <span className="font-bold text-white text-xs md:text-sm shrink-0 w-36">Firebase & Firestore:</span>
            <span className="text-xs md:text-sm text-slate-300">Provides high-speed real-time database synchronization and tokenized authentication.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <span className="font-bold text-white text-xs md:text-sm shrink-0 w-36">Cloudinary:</span>
            <span className="text-xs md:text-sm text-slate-300">Secure media storage for digital delivery photo proofs and menu imagery.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <span className="font-bold text-white text-xs md:text-sm shrink-0 w-36">Cloud Backups:</span>
            <span className="text-xs md:text-sm text-slate-300">Encrypted off-site backups for disaster recovery and operational continuity.</span>
          </div>
        </div>
      </section>

      {/* ── Section 6: Data Security ── */}
      <section id="data-security" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">6</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Data Security</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used, 
          or accessed in an unauthorized way. All financial transactions are processed exclusively through certified, encrypted 
          payment gateways (PCI-DSS compliant).
        </p>
      </section>

      {/* ── Section 7: Data Retention ── */}
      <section id="data-retention" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">7</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Data Retention</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We retain your personal data only for as long as reasonably necessary to fulfill the purposes we collected it for, 
          including satisfying legal, tax, accounting, or regulatory requirements.
        </p>
      </section>

      {/* ── Section 8: Customer Rights & Deletion ── */}
      <section id="customer-rights" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">8</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Customer Rights & Data Deletion Requests</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Under data protection laws (GDPR, DPDP), you possess specific enforceable rights regarding your personal data:
        </p>
        <ul className="space-y-2.5 text-sm md:text-base text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span><strong>Right to Access:</strong> Request a complete copy of all personal records we hold on file.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span><strong>Right to Rectification:</strong> Request corrections to inaccurate or incomplete profile information.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <span><strong>Right to Erasure (Right to be Forgotten):</strong> Request permanent deletion of your account and personal history.</span>
          </li>
        </ul>

        {/* Action card */}
        <div className="bg-gradient-to-r from-red-950/30 to-[#121418] border border-red-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Looking to erase your account & profile?</h3>
            <p className="text-xs text-slate-400">Submit a self-service request through our secure deletion portal.</p>
          </div>
          <Link
            to="/delete-account"
            className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-bold transition-all shrink-0"
          >
            Data Deletion Center →
          </Link>
        </div>
      </section>

      {/* ── Section 9: Children's Privacy ── */}
      <section id="childrens-privacy" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">9</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Children's Privacy</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Our services are not intended for children under 13 years of age. We do not knowingly collect personal identifiable information from children under 13.
        </p>
      </section>

      {/* ── Section 10: Policy Updates ── */}
      <section id="policy-updates" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">10</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Policy Updates</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We maintain our privacy policy under regular review. This version was last updated on {lastUpdated}. 
          Any future revisions will be published on this page with an updated timestamp.
        </p>
      </section>

      {/* ── Section 11: Contact Information ── */}
      <section id="contact" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">11</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Contact Information</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          If you have questions or concerns regarding this privacy statement or our data handling practices, reach our Data Privacy Team:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <Mail className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="text-xs text-slate-400">Email</div>
            <a href="mailto:privacy@olivepizza.com" className="text-xs font-bold text-white hover:text-emerald-400 transition-colors">
              privacy@olivepizza.com
            </a>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <Phone className="w-4 h-4 text-amber-400 mb-2" />
            <div className="text-xs text-slate-400">Phone</div>
            <span className="text-xs font-bold text-white">+1 (555) 123-4567</span>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <MapPin className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="text-xs text-slate-400">Headquarters</div>
            <span className="text-xs font-bold text-white">123 Pizza Street, Foodville, NY 10001</span>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
