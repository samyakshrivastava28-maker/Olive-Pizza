import React, { useState } from 'react';
import { Bell, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const AnnouncementManager: React.FC = () => {
  const activeAnnouncement = useWebsiteConfigStore((state) => state.activeAnnouncement);
  const [text, setText] = useState(activeAnnouncement?.text || '🍕 FREE Cheesy Garlic Bread on all orders above ₹499! Use code: CHEESE');
  const [emoji, setEmoji] = useState(activeAnnouncement?.emoji || '🔥');
  const [bgColor, setBgColor] = useState(activeAnnouncement?.backgroundColor || '#ea580c');
  const [textColor, setTextColor] = useState(activeAnnouncement?.textColor || '#ffffff');
  const [isActive, setIsActive] = useState(activeAnnouncement?.isActive ?? true);
  const [link, setLink] = useState(activeAnnouncement?.link || '/menu');
  const [linkText, setLinkText] = useState(activeAnnouncement?.linkText || 'Order Now');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/campaigns/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          announcement: {
            id: 'top_global_announcement',
            isActive,
            type: 'promo',
            text,
            emoji,
            backgroundColor: bgColor,
            textColor,
            link,
            linkText,
            closeable: true,
            priority: 1,
            targetRoutes: ['/'],
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Announcement published live!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Top Announcement Bar Manager
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Publish high-visibility notice bars and promotional offers across the website & mobile app.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Publishing...' : 'Publish Announcement'}
        </button>
      </div>

      {/* Live Preview Box */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <h3 className="text-white font-bold text-sm">Live Preview</h3>
        {isActive ? (
          <div
            style={{ backgroundColor: bgColor, color: textColor }}
            className="p-3 rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm font-semibold shadow-md text-center"
          >
            <span>{emoji}</span>
            <span>{text}</span>
            {link && (
              <span className="underline ml-1 cursor-pointer">
                {linkText} →
              </span>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-slate-500 text-xs text-center">
            Announcement Bar is currently disabled
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-white font-medium text-xs">Enable Announcement Bar</label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Emoji Icon</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Announcement Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Link Destination</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Link Button Text</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Background Color</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full h-10 mt-1 rounded-xl cursor-pointer bg-transparent border-0"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Text Color</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-full h-10 mt-1 rounded-xl cursor-pointer bg-transparent border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default AnnouncementManager;
