import LegalPageLayout from '../components/layout/LegalPageLayout';
import { Trash2, Download, AlertTriangle } from 'lucide-react';

export default function DeleteAccount() {
  const toc = [
    { id: "instructions", label: "Deletion Instructions" },
    { id: "request-form", label: "Request Form" }
  ];

  return (
    <LegalPageLayout
      title="Data Deletion Request"
      description="Manage your data. Request a download of your data or complete account deletion."
      lastUpdated="June 30, 2026"
      toc={toc}
      canonicalUrl="/delete-account"
      breadcrumbs={[{ name: "Home", url: "/" }, { name: "Delete Account", url: "/delete-account" }]}
    >
      <h2 id="instructions">Deletion Instructions</h2>
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
        <div className="flex items-start">
          <AlertTriangle className="text-red-500 w-6 h-6 mr-3 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-bold m-0 text-lg">Warning: Permanent Action</h3>
            <p className="text-red-700 dark:text-red-300 mt-2 mb-0">
              Account deletion is irreversible. All your order history, loyalty points, saved addresses, and active coupons will be permanently erased.
            </p>
          </div>
        </div>
      </div>
      
      <p>
        If you wish to download your data before deleting your account, please check the box in the form below. 
        Once submitted, our team will process your request within 7 business days in accordance with GDPR and local privacy laws.
      </p>

      <h2 id="request-form">Submit Request</h2>
      <form className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 mt-6 max-w-2xl not-prose">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Registered Email Address</label>
            <input type="email" required className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500" placeholder="your@email.com" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reason for Deletion (Optional)</label>
            <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 text-slate-700 dark:text-slate-300">
              <option>Privacy concerns</option>
              <option>No longer using the service</option>
              <option>Receiving too many emails</option>
              <option>Other</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <input type="checkbox" id="download-data" className="w-5 h-5 accent-primary-500 rounded cursor-pointer" />
            <label htmlFor="download-data" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer flex items-center gap-2">
              <Download className="w-4 h-4 text-primary-500" /> Send me a copy of my data before deletion
            </label>
          </div>

          <div className="flex items-start gap-3 mt-8">
            <input type="checkbox" required id="confirm" className="w-5 h-5 mt-1 accent-red-500 rounded cursor-pointer" />
            <label htmlFor="confirm" className="text-slate-600 dark:text-slate-400 text-sm cursor-pointer">
              I understand that this action cannot be undone. All my loyalty points, order history, and personal information will be permanently deleted.
            </label>
          </div>

          <button type="button" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Trash2 className="w-5 h-5" />
            Permanently Delete My Account
          </button>
        </div>
      </form>
    </LegalPageLayout>
  );
}
