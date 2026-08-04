import React, { useState } from 'react';
import { Compass, Plus, Trash2, Save, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebsiteConfigStore, NavigationConfig } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const NavigationBuilder: React.FC = () => {
  const currentNav = useWebsiteConfigStore((state) => state.navigation);
  const [nav, setNav] = useState<NavigationConfig>(
    currentNav || {
      version: 1,
      header: {
        logoPosition: 'left',
        links: [
          { id: '1', label: 'Menu', path: '/menu', visibility: 'all' },
          { id: '2', label: 'Deals & Offers', path: '/menu?category=deals', visibility: 'all', badge: 'HOT' },
          { id: '3', label: 'Live Tracking', path: '/tracking', visibility: 'all' },
        ],
        ctaButton: { label: 'Order Online', link: '/menu', style: 'primary', isVisible: true },
        style: 'glass',
        height: '64px',
        isSticky: true,
        showSearch: true,
      },
      bottomNav: {
        items: [
          { id: '1', label: 'Home', path: '/', icon: 'Home', visibility: 'all' },
          { id: '2', label: 'Menu', path: '/menu', icon: 'Pizza', visibility: 'all' },
          { id: '3', label: 'Orders', path: '/orders', icon: 'ShoppingBag', visibility: 'customer' },
          { id: '4', label: 'Profile', path: '/profile', icon: 'User', visibility: 'customer' },
        ],
        showBadges: true,
      },
      footer: {
        columns: [
          {
            heading: 'Olive Pizza',
            links: [
              { label: 'Our Story', url: '/about' },
              { label: 'Artisan Crust', url: '/menu' },
              { label: 'Quality Guarantee', url: '/terms' },
            ],
          },
          {
            heading: 'Help & Support',
            links: [
              { label: 'Live Order Tracking', url: '/tracking' },
              { label: 'Customer Care', url: '/contact' },
              { label: 'FAQs', url: '/faq' },
            ],
          },
        ],
        socialLinks: [
          { platform: 'Instagram', url: 'https://instagram.com', icon: 'instagram' },
          { platform: 'WhatsApp', url: 'https://wa.me/919999999999', icon: 'whatsapp' },
        ],
        copyrightText: '© 2026 Olive Pizza. Handcrafted with passion in Rajnandgaon.',
        showDeveloperCredit: true,
        developerCreditUrl: 'https://28webhub.netlify.app',
      },
    }
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/website-manager/publish/navigation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ navigation: nav }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Navigation published live!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save navigation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Navigation & Footer Builder
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Customize header navigation, mobile bottom navigation bar, and multi-column footer links.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Publishing...' : 'Publish Navigation'}
        </button>
      </div>

      {/* Header Links */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">Header Links</h3>
          <button
            onClick={() =>
              setNav({
                ...nav,
                header: {
                  ...nav.header,
                  links: [
                    ...nav.header.links,
                    { id: String(Date.now()), label: 'New Link', path: '/menu', visibility: 'all' },
                  ],
                },
              })
            }
            className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Link
          </button>
        </div>

        <div className="space-y-3">
          {nav.header.links.map((link, idx) => (
            <div key={link.id || idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <input
                type="text"
                value={link.label}
                onChange={(e) => {
                  const updated = [...nav.header.links];
                  updated[idx].label = e.target.value;
                  setNav({ ...nav, header: { ...nav.header, links: updated } });
                }}
                placeholder="Label"
                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={link.path}
                onChange={(e) => {
                  const updated = [...nav.header.links];
                  updated[idx].path = e.target.value;
                  setNav({ ...nav, header: { ...nav.header, links: updated } });
                }}
                placeholder="Route Path"
                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={link.badge || ''}
                onChange={(e) => {
                  const updated = [...nav.header.links];
                  updated[idx].badge = e.target.value;
                  setNav({ ...nav, header: { ...nav.header, links: updated } });
                }}
                placeholder="Badge (e.g. HOT)"
                className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-amber-400"
              />
              <button
                onClick={() => {
                  const updated = nav.header.links.filter((_, i) => i !== idx);
                  setNav({ ...nav, header: { ...nav.header, links: updated } });
                }}
                className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10"
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
export default NavigationBuilder;
