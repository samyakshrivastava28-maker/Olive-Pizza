import React, { useState, useEffect } from 'react';
import { Image, Search, Copy, Upload, Filter, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const MediaLibrary: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [folder, setFolder] = useState('olive-pizza');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `${BACKEND}/api/media-library/assets?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(search)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [folder]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Asset URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Media & Asset Library
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Cloudinary-backed media repository for menu items, banners, hero assets, and AI imagery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="olive-pizza">All Folders</option>
            <option value="olive-pizza/menu">Menu Items</option>
            <option value="olive-pizza/promotions">Promotions & Banners</option>
            <option value="olive-pizza/ai-generated">AI Generated</option>
          </select>
        </div>
      </div>

      {/* Grid of assets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="group relative rounded-xl overflow-hidden border border-white/10 bg-slate-900/60 aspect-square flex flex-col justify-end"
          >
            <img
              src={asset.thumbnailUrl || asset.url}
              alt={asset.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-300 font-mono self-end bg-black/60 px-1.5 py-0.5 rounded">
                {asset.format?.toUpperCase()}
              </span>
              <div>
                <p className="text-white text-xs font-semibold truncate mb-1">{asset.name}</p>
                <button
                  onClick={() => handleCopyUrl(asset.url, asset.id)}
                  className="w-full py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                >
                  {copiedId === asset.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === asset.id ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {assets.length === 0 && !loading && (
        <div className="p-12 text-center text-slate-500 text-xs">
          No media assets found in this folder.
        </div>
      )}
    </div>
  );
};
export default MediaLibrary;
