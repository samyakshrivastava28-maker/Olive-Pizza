import React, { useState } from 'react';
import { useSDUIStore, DEFAULT_NAVIGATION } from '../../../../stores/sduiStore';
import { NavigationConfig } from '../../../../types/sdui.types';
import { Compass, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const NavigationTab: React.FC = () => {
  const currentNav = useSDUIStore((state) => state.navigation);
  const updateNav = useSDUIStore((state) => state.updateNavigation);

  const [nav, setNav] = useState<NavigationConfig>(currentNav || DEFAULT_NAVIGATION);

  const handleAddHeaderLink = () => {
    const newLink = { id: `link_${Date.now()}`, label: 'New Link', path: '/menu', visibility: 'all' };
    setNav({
      ...nav,
      header: { ...nav.header, links: [...nav.header.links, newLink] },
    });
  };

  const handleRemoveHeaderLink = (id: string) => {
    setNav({
      ...nav,
      header: { ...nav.header, links: nav.header.links.filter((l) => l.id !== id) },
    });
  };

  const handleSave = async () => {
    await updateNav(nav);
    toast.success('Navigation bar updated live!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary-400" /> Navigation Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure header links, sticky behavior, search icon, and mobile bottom navigation icons.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold text-sm text-white shadow-lg shadow-primary-500/20 transition-all"
        >
          <Check className="w-4 h-4" /> Save Navigation
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Header Links</h3>
          <button
            onClick={handleAddHeaderLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-primary-400 hover:text-white"
          >
            <Plus className="w-4 h-4" /> Add Link
          </button>
        </div>

        <div className="space-y-2">
          {nav.header?.links?.map((link, idx) => (
            <div key={link.id || idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-white/5">
              <input
                type="text"
                value={link.label}
                onChange={(e) => {
                  const updated = [...nav.header.links];
                  updated[idx].label = e.target.value;
                  setNav({ ...nav, header: { ...nav.header, links: updated } });
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-white"
              />
              <input
                type="text"
                value={link.path}
                onChange={(e) => {
                  const updated = [...nav.header.links];
                  updated[idx].path = e.target.value;
                  setNav({ ...nav, header: { ...nav.header, links: updated } });
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-slate-300"
              />
              <button
                onClick={() => handleRemoveHeaderLink(link.id)}
                className="p-2 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default NavigationTab;
