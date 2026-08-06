import React, { useState } from 'react';
import { useSDUIStore } from '../../../../stores/sduiStore';
import { AnnouncementItem } from '../../../../types/sdui.types';
import { Megaphone, Plus, Trash2, Check, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export const AnnouncementTab: React.FC = () => {
  const announcements = useSDUIStore((state) => state.announcements);
  const updateAnnouncements = useSDUIStore((state) => state.updateAnnouncements);

  const [items, setItems] = useState<AnnouncementItem[]>(announcements);

  const handleAdd = () => {
    const newItem: AnnouncementItem = {
      id: `ann_${Date.now()}`,
      type: 'free_delivery',
      title: 'Free Delivery',
      text: '⚡ Free Express Delivery on orders above $25!',
      emoji: '🛵',
      bgColor: '#ea580c',
      textColor: '#ffffff',
      isActive: true,
    };
    setItems([...items, newItem]);
  };

  const handleToggle = (id: string) => {
    const updated = items.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    setItems(updated);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((a) => a.id !== id);
    setItems(updated);
  };

  const handleSave = async () => {
    await updateAnnouncements(items);
    toast.success('Announcements updated live!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary-400" /> Announcement Banner Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create scheduled top banner alerts (Free Delivery, Festival, Offer, Maintenance, Holiday).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Add Banner
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
            No announcements created yet. Click "+ Add Banner" above.
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.emoji || '📢'}</span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].title = e.target.value;
                      setItems(updated);
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 border border-white/10 font-bold text-white text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      item.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Disabled'}
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Banner Announcement Text</label>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].text = e.target.value;
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
export default AnnouncementTab;
