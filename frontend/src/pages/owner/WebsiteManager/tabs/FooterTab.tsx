import React, { useState } from 'react';
import { useSDUIStore, DEFAULT_FOOTER } from '../../../../stores/sduiStore';
import { FooterConfig } from '../../../../types/sdui.types';
import { Layout, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const FooterTab: React.FC = () => {
  const currentFooter = useSDUIStore((state) => state.footer);
  const updateFooter = useSDUIStore((state) => state.updateFooter);

  const [footer, setFooter] = useState<FooterConfig>(currentFooter || DEFAULT_FOOTER);

  const handleSave = async () => {
    await updateFooter(footer);
    toast.success('Footer configuration updated!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary-400" /> Footer Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage company tagline, contact phone/email, address, links, social channels, and payment badges.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold text-sm text-white shadow-lg shadow-primary-500/20 transition-all"
        >
          <Check className="w-4 h-4" /> Save Footer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white">Company Identity</h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Company Name</label>
            <input
              type="text"
              value={footer.companyName}
              onChange={(e) => setFooter({ ...footer, companyName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Tagline</label>
            <input
              type="text"
              value={footer.tagline}
              onChange={(e) => setFooter({ ...footer, tagline: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Copyright Text</label>
            <input
              type="text"
              value={footer.copyrightText}
              onChange={(e) => setFooter({ ...footer, copyrightText: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-300"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white">Contact & Location</h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Contact Phone</label>
            <input
              type="text"
              value={footer.contactPhone}
              onChange={(e) => setFooter({ ...footer, contactPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Contact Email</label>
            <input
              type="text"
              value={footer.contactEmail}
              onChange={(e) => setFooter({ ...footer, contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Store Address</label>
            <input
              type="text"
              value={footer.address}
              onChange={(e) => setFooter({ ...footer, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default FooterTab;
