import React, { useState } from 'react';
import { useSDUIStore } from '../../../../stores/sduiStore';
import { CampaignItem } from '../../../../types/sdui.types';
import { Flame, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const CampaignsTab: React.FC = () => {
  const campaigns = useSDUIStore((state) => state.campaigns);
  const updateCampaigns = useSDUIStore((state) => state.updateCampaigns);

  const [items, setItems] = useState<CampaignItem[]>(campaigns);

  const handleAdd = () => {
    const newCamp: CampaignItem = {
      id: `camp_${Date.now()}`,
      name: 'Diwali Pizza Festival',
      type: 'diwali',
      isActive: true,
      heroHeadline: '✨ Light Up Your Tastebuds This Diwali!',
      heroSubhead: 'Get 30% OFF on all gourmet sourdough pizzas',
    };
    setItems([...items, newCamp]);
  };

  const handleSave = async () => {
    await updateCampaigns(items);
    toast.success('Campaign override rules updated!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" /> Festive Campaign Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create festive & seasonal campaign overrides (Diwali, Christmas, New Year, Weekend Sale, Pizza Festival).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Add Campaign
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold text-sm text-white shadow-lg shadow-primary-500/20"
          >
            <Check className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10 text-slate-400">
            No active campaigns. Click "+ Add Campaign" above to override Hero & Theme for festival events.
          </div>
        ) : (
          items.map((camp, idx) => (
            <div key={camp.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={camp.name}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].name = e.target.value;
                    setItems(updated);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 border border-white/10 font-bold text-white text-sm"
                />
                <button
                  onClick={() => {
                    const updated = items.filter((c) => c.id !== camp.id);
                    setItems(updated);
                  }}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Campaign Hero Headline</label>
                <input
                  type="text"
                  value={camp.heroHeadline || ''}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].heroHeadline = e.target.value;
                    setItems(updated);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default CampaignsTab;
