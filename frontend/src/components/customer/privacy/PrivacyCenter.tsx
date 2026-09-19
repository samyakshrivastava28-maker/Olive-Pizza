import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/firebase';
import { fetchApi } from '../../../lib/config';
import { useAuthStore } from '../../../lib/store';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  FileText,
  Download,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  Lock,
  Baby,
  RefreshCw,
  Mail,
  Phone,
  Info
} from 'lucide-react';

export default function PrivacyCenter() {
  const { user, setUser } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'consents' | 'data' | 'correct' | 'policy' | 'grievance' | 'delete'>('consents');

  // Policy State
  const [policy, setPolicy] = useState<any>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  // Consents State
  const [consents, setConsents] = useState<Record<string, boolean>>({
    MARKETING_PROMOTIONS: false,
    MARKETING_SMS: false,
    MARKETING_EMAIL: false,
    ANALYTICS_OPTIONAL: false
  });
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);

  // Correction Form State
  const [corrName, setCorrName] = useState(user?.name || '');
  const [corrPhone, setCorrPhone] = useState(user?.phone || '');
  const [corrEmail, setCorrEmail] = useState(user?.email || '');
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Data Export State
  const [exportingData, setExportingData] = useState(false);

  // Grievance Form State
  const [grvCategory, setGrvCategory] = useState<'CONSENT' | 'ACCESS_EXPORT' | 'CORRECTION' | 'ERASURE' | 'SECURITY' | 'OTHER'>('CONSENT');
  const [grvDescription, setGrvDescription] = useState('');
  const [grvContact, setGrvContact] = useState(user?.email || user?.phone || '');
  const [submittingGrievance, setSubmittingGrievance] = useState(false);
  const [userGrievances, setUserGrievances] = useState<any[]>([]);

  // Deletion Request State
  const [deleteEmail, setDeleteEmail] = useState(user?.email || '');
  const [deleteReason, setDeleteReason] = useState('Privacy concerns');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadConsents();
    loadPolicy();
    loadGrievances();
  }, [user]);

  const loadPolicy = async () => {
    setLoadingPolicy(true);
    try {
      const res = await fetchApi('/api/privacy/policy');
      const data = await res.json();
      if (data.success && data.policy) {
        setPolicy(data.policy);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingPolicy(false);
    }
  };

  const loadConsents = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetchApi('/api/privacy/consents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.consents) {
        setConsents(data.consents);
      }
    } catch {
      // Ignore
    }
  };

  const loadGrievances = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetchApi('/api/privacy/grievances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.grievances)) {
        setUserGrievances(data.grievances);
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleConsent = async (purpose: string, currentValue: boolean) => {
    setUpdatingConsent(purpose);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Please sign in to update privacy preferences.');
        return;
      }

      const nextVal = !currentValue;
      const res = await fetchApi('/api/privacy/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          purpose,
          granted: nextVal,
          policyVersion: policy?.version || '1.0.0'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update consent');

      setConsents((prev) => ({ ...prev, [purpose]: nextVal }));
      toast.success(nextVal ? 'Consent granted.' : 'Consent withdrawn.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update consent.');
    } finally {
      setUpdatingConsent(null);
    }
  };

  const handleDownloadExport = async () => {
    setExportingData(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Please sign in to request personal data export.');
        return;
      }

      const res = await fetchApi('/api/privacy/data-access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Export request failed');

      // Create download link for sanitized JSON
      const jsonStr = JSON.stringify(data.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `olive_pizza_my_data_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Your personal data archive has been downloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download data export.');
    } finally {
      setExportingData(false);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCorrection(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Please sign in to update details.');
        return;
      }

      const res = await fetchApi('/api/privacy/correction-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: corrName,
          phone: corrPhone,
          email: corrEmail
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      if (user) {
        setUser({
          ...user,
          name: corrName || user.name,
          phone: corrPhone || user.phone,
          email: corrEmail || user.email
        }, 'customer');
      }

      toast.success('Your personal records have been corrected.');
    } catch (err: any) {
      toast.error(err.message || 'Correction failed.');
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grvDescription.trim()) {
      toast.error('Please enter a description for your complaint.');
      return;
    }

    setSubmittingGrievance(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Please sign in to lodge a grievance.');
        return;
      }

      const res = await fetchApi('/api/privacy/grievance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: grvCategory,
          description: grvDescription,
          customerName: user?.name || 'Customer',
          customerContact: grvContact
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register grievance');

      toast.success(`Grievance registered! Ticket #${data.ticketId}`);
      setGrvDescription('');
      loadGrievances();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit grievance.');
    } finally {
      setSubmittingGrievance(false);
    }
  };

  const handleSubmitDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteEmail || !confirmDelete) {
      toast.error('Please confirm your email address and accept the terms.');
      return;
    }

    setSubmittingDelete(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Please sign in to request account deletion.');
        return;
      }

      const res = await fetchApi('/api/privacy/deletion-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: deleteEmail,
          reason: deleteReason,
          downloadDataRequested: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request account deletion');

      setDeleteSuccess(data.message || 'Account erasure request registered.');
      toast.success('Deletion request registered successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Deletion request failed.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Sub-Navigation Pill Header ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-2 border border-orange-100 shadow-sm flex flex-wrap gap-1.5">
        {[
          { id: 'consents', label: 'Consent Preferences', icon: ShieldCheck },
          { id: 'data', label: 'My Personal Data', icon: Download },
          { id: 'correct', label: 'Correct Information', icon: Edit3 },
          { id: 'policy', label: 'Privacy Notice', icon: FileText },
          { id: 'grievance', label: 'Grievance / DPO', icon: HelpCircle },
          { id: 'delete', label: 'Account Erasure', icon: Trash2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-orange-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Section: Consent Preferences ────────────────────────────────────── */}
      {activeSection === 'consents' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              <span>Consent & Communication Preferences</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Under India's Digital Personal Data Protection (DPDP) Act, you have full authority to grant or withdraw optional processing consents at any time.
            </p>
          </div>

          {/* Service-Required Notice Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-0.5">
              <span className="font-bold block">Service-Required Order Communications</span>
              <p className="text-emerald-800 leading-relaxed">
                Order status updates, kitchen dispatch notices, rider delivery tracking, and transactional payment receipts are legally and contractually required to fulfill your food order. Withdrawing optional marketing consent will <strong>never</strong> interrupt your food ordering or live tracking.
              </p>
            </div>
          </div>

          {/* Optional Toggles */}
          <div className="divide-y divide-slate-100">
            {[
              {
                id: 'MARKETING_PROMOTIONS',
                title: 'Promotional Push Notifications',
                desc: 'Receive alerts regarding wood-fired pizza flash discounts, festive coupons, and exclusive loyalty rewards.'
              },
              {
                id: 'MARKETING_SMS',
                title: 'Promotional SMS / WhatsApp Alerts',
                desc: 'Periodic special discount coupons and combo offers delivered to your registered mobile number.'
              },
              {
                id: 'MARKETING_EMAIL',
                title: 'Newsletter & Weekly Specials',
                desc: 'Weekly chef specials, new crust announcements, and personalized culinary recommendations.'
              },
              {
                id: 'ANALYTICS_OPTIONAL',
                title: 'Optional Experience Personalization',
                desc: 'Allows us to remember your preferred pizza sizes and crusts to expedite future reorders.'
              }
            ].map((item) => {
              const isGranted = Boolean(consents[item.id]);
              const isBusy = updatingConsent === item.id;
              return (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                    <p className="text-xs text-slate-500 max-w-xl">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleConsent(item.id, isGranted)}
                    disabled={isBusy}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isGranted ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isGranted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section: My Personal Data & Export ────────────────────────────────── */}
      {activeSection === 'data' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-rose-600" />
              <span>Right to Access & Data Portability</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              You are entitled to access and download a structured, portable digital archive containing all personal data retained by Olive Pizza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Registered Name</span>
              <p className="text-sm font-bold text-slate-800">{user?.name || 'Customer'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Contact Phone</span>
              <p className="text-sm font-bold text-slate-800">{user?.phone || 'Not verified'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
              <p className="text-sm font-bold text-slate-800">{user?.email || 'Not verified'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Data Protection Scope</span>
              <p className="text-sm font-bold text-emerald-600">Active Account • DPDP Protected</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-200/60 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">What is included in your Data Archive?</h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Complete customer identity profile and account creation timestamp.</li>
              <li>Saved delivery address coordinates and delivery landmarks.</li>
              <li>Historical food orders, customized pizza itemizations, and payment records.</li>
              <li>Active communication preferences and consent audit history.</li>
              <li>All passwords, credit card numbers, and security tokens are strictly excluded.</li>
            </ul>

            <button
              onClick={handleDownloadExport}
              disabled={exportingData}
              className="mt-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {exportingData ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling Secure Archive...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Personal Data Archive (.JSON)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Section: Correct Information ─────────────────────────────────────── */}
      {activeSection === 'correct' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-rose-600" />
              <span>Right to Correction & Updating</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Maintain accurate records. You can update your primary contact details directly below.
            </p>
          </div>

          <form onSubmit={handleSaveCorrection} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={corrName}
                onChange={(e) => setCorrName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="Your Full Name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
              <input
                type="tel"
                value={corrPhone}
                onChange={(e) => setCorrPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="10-digit phone number"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={corrEmail}
                onChange={(e) => setCorrEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="name@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={savingCorrection}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {savingCorrection ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update My Information</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── Section: Privacy Notice Viewer ───────────────────────────────────── */}
      {activeSection === 'policy' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                <span>{policy?.title || 'Olive Pizza Privacy Notice'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Version {policy?.version || '1.0.0'} • Effective Date: {policy?.effectiveDate || 'June 30, 2026'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider self-start sm:self-auto">
              Statutory Active Notice
            </span>
          </div>

          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-4">
            {policy?.content ? (
              policy.content.split('\n\n').map((para: string, idx: number) => {
                if (para.startsWith('###')) {
                  return (
                    <h4 key={idx} className="text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                      {para.replace(/###\s*/, '')}
                    </h4>
                  );
                }
                return <p key={idx} className="text-xs sm:text-sm text-slate-600 leading-relaxed">{para}</p>;
              })
            ) : (
              <p className="text-xs text-slate-400">Loading active privacy notice...</p>
            )}
          </div>
        </div>
      )}

      {/* ── Section: Grievance Redressal / DPO ───────────────────────────────── */}
      {activeSection === 'grievance' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-rose-600" />
              <span>Grievance Redressal Mechanism & Privacy Officer</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Under Section 13 of the DPDP Act, you have the statutory right to register a privacy complaint. Our designated Grievance Redressal Team will respond within 30 days.
            </p>
          </div>

          {/* Grievance Officer Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">Designated Grievance Officer:</span>
              <p className="text-slate-600">Privacy & Compliance Redressal Cell</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">Official Redressal Email:</span>
              <p className="text-slate-600">privacy@olivepizza.in / olivepizzarjn@gmail.com</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">Operational Jurisdiction:</span>
              <p className="text-slate-600">Rajnandgaon, Chhattisgarh 491441, India</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">Statutory SLA:</span>
              <p className="text-emerald-700 font-bold">Resolution within 30 calendar days</p>
            </div>
          </div>

          {/* Grievance Submission Form */}
          <form onSubmit={handleSubmitGrievance} className="space-y-4 max-w-xl">
            <h4 className="text-sm font-black text-slate-900">Lodge a Formal Privacy Complaint</h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Complaint Category</label>
              <select
                value={grvCategory}
                onChange={(e) => setGrvCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="CONSENT">Consent & Marketing Withdrawal</option>
                <option value="ACCESS_EXPORT">Data Access & Portability</option>
                <option value="CORRECTION">Inaccurate Personal Records</option>
                <option value="ERASURE">Account Deletion & Data Erasure</option>
                <option value="SECURITY">Security or Unauthorized Processing</option>
                <option value="OTHER">Other Privacy Inquiries</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Response Contact</label>
              <input
                type="text"
                value={grvContact}
                onChange={(e) => setGrvContact(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="Email or Mobile Phone"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description of Issue</label>
              <textarea
                value={grvDescription}
                onChange={(e) => setGrvDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="Please describe your privacy complaint in detail..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingGrievance}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {submittingGrievance ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Complaint...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Privacy Grievance</span>
                </>
              )}
            </button>
          </form>

          {/* User's Previous Grievance Tickets */}
          {userGrievances.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h4 className="text-sm font-bold text-slate-800">Your Registered Grievance Tickets</h4>
              <div className="space-y-2">
                {userGrievances.map((g, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-800">{g.ticketId}</span>
                      <p className="text-slate-500 mt-0.5 line-clamp-1">{g.description}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                      g.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section: Account Erasure & Deletion ───────────────────────────────── */}
      {activeSection === 'delete' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Request Account Erasure & Data Deletion</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Submit a formal request to permanently delete your personal account data.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-950 space-y-1">
              <span className="font-bold block">Important Statutory Retention Rules</span>
              <p className="text-red-900 leading-relaxed">
                Under Section 36 of the Central Goods and Services Tax (CGST) Act and Indian Income Tax regulations, businesses are legally mandated to retain financial tax invoices for up to 8 years. When your deletion request is executed, your personal identifiers (name, phone, saved delivery locations) are permanently scrubbed and pseudonymized, while financial transaction ledgers are retained purely for statutory tax audits.
              </p>
            </div>
          </div>

          {deleteSuccess ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">Deletion Request Recorded</h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">{deleteSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitDeletion} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Verify Registered Email</label>
                <input
                  type="email"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="Confirm your email address"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Deletion</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="Privacy concerns">Privacy concerns</option>
                  <option value="Too many notifications">Too many notifications</option>
                  <option value="Relocating from Rajnandgaon">Relocating from Rajnandgaon</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="confirm_delete"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  required
                />
                <label htmlFor="confirm_delete" className="text-xs text-slate-600 leading-relaxed">
                  I understand that this action initiates a 30-day statutory grace period, after which my account, saved addresses, and loyalty points will be permanently erased.
                </label>
              </div>

              <button
                type="submit"
                disabled={submittingDelete || !confirmDelete}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {submittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Submit Deletion Request</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Children's Privacy Notice Footer ─────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/50 flex items-start gap-3">
        <Baby className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-0.5">
          <span className="font-bold block">Children's Data Protection</span>
          <p className="text-amber-800 leading-relaxed">
            Olive Pizza adheres to DPDP statutory provisions regarding minors. Persons under 18 years of age should order food exclusively under the guidance and oversight of a parent or legal guardian. We do not engage in behavioral monitoring or targeted advertising directed at children.
          </p>
        </div>
      </div>
    </div>
  );
}
