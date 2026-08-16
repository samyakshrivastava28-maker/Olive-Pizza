import { useState } from 'react';
import LegalPageLayout, { TocItem, HighlightCard } from '../components/layout/LegalPageLayout';
import { Trash2, Download, AlertTriangle, ShieldAlert, CheckCircle2, UserX, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeleteAccount() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Privacy concerns');
  const [downloadData, setDownloadData] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toc: TocItem[] = [
    { id: "instructions", label: "1. Deletion Overview & Impact" },
    { id: "request-form", label: "2. Submit Deletion Request" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <UserX className="w-5 h-5" />,
      title: "Complete Removal",
      description: "Permanently erases all profile records, saved addresses, and active coupons."
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Data Export Option",
      description: "Request a downloadable JSON/PDF copy of your data prior to permanent erasure."
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "7-Day Processing",
      description: "Processed under strict GDPR and DPDP statutory timelines."
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !confirmed) {
      toast.error("Please enter your email and confirm the permanent deletion statement.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success("Account deletion request submitted successfully.");
    }, 1200);
  };

  return (
    <LegalPageLayout
      title="Data Deletion & Privacy Center"
      badge="User Privacy & Data Rights"
      description="Manage your personal records. Request a full data export or permanently delete your account."
      lastUpdated="June 30, 2026"
      toc={toc}
      highlights={highlights}
      icon={<Trash2 className="w-3.5 h-3.5" />}
      canonicalUrl="/delete-account"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Delete Account", url: "/delete-account" }
      ]}
    >
      {/* ── Section 1: Overview ── */}
      <section id="instructions" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Deletion Instructions & Consequences</h2>
        </div>

        {/* Warning Callout Card */}
        <div className="p-5 rounded-2xl bg-red-950/30 border border-red-500/30 flex items-start gap-4">
          <AlertTriangle className="text-red-400 w-6 h-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-red-300 uppercase tracking-wider m-0">Warning: Permanent & Irreversible Action</h3>
            <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed m-0">
              Account deletion is permanent. Once completed, your entire order history, earned loyalty points, active coupons, 
              saved delivery locations, and customized dietary preferences will be completely wiped from our production database.
            </p>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          If you wish to download your records before deleting your account, ensure you check the "Send me a copy of my data" option in the form below. 
          Once submitted, our compliance team processes your request within <strong>7 business days</strong> in compliance with GDPR and local privacy laws.
        </p>
      </section>

      {/* ── Section 2: Form ── */}
      <section id="request-form" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Submit Deletion Request</h2>
        </div>

        {submitted ? (
          <div className="p-8 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Request Received</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              We have logged your deletion request for <strong className="text-white">{email}</strong>. 
              A confirmation dispatch will be sent to your email address once data erasure is finalized within 7 business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-5 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-4 py-3 rounded-xl bg-dark-900/90 border border-white/15 focus:border-red-500 text-white text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Reason for Deletion (Optional)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-900/90 border border-white/15 focus:border-red-500 text-white text-sm focus:outline-none transition-colors"
              >
                <option value="Privacy concerns">Privacy concerns</option>
                <option value="No longer using the service">No longer using the service</option>
                <option value="Receiving too many communications">Receiving too many communications</option>
                <option value="Relocated outside delivery zone">Relocated outside delivery zone</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Data Export Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/10 cursor-pointer hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={downloadData}
                onChange={(e) => setDownloadData(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer"
              />
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white flex items-center gap-1.5 mb-0.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Send me a full copy of my account data before deletion
                </span>
                We will email an encrypted archive of your transaction history and profile data.
              </div>
            </label>

            {/* Final Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-500/20 cursor-pointer hover:border-red-500/40 transition-all">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-red-500 rounded cursor-pointer"
              />
              <div className="text-xs text-red-200">
                <span className="font-bold block mb-0.5">I understand this action is irreversible *</span>
                I confirm that I want to permanently erase my Olive Pizza account, order logs, and accumulated loyalty points.
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete My Account</span>
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </LegalPageLayout>
  );
}
