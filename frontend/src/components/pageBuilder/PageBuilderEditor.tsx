import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageBlock, BlockType } from '../../types/pageBuilder';
import PageRenderer from './PageRenderer';
import { useAuthStore } from '../../lib/store';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Save,
  RotateCcw,
  Smartphone,
  Monitor,
  Settings,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const AVAILABLE_BLOCK_TYPES: { type: BlockType; label: string; description: string }[] = [
  { type: 'HeroBanner', label: 'Hero Banner', description: 'Large hero section with background, headline & search' },
  { type: 'PromoBannerCarousel', label: 'Promo Carousel', description: 'Rotating discount banners and promotional cards' },
  { type: 'CategoryGrid', label: 'Category Grid', description: 'Interactive grid of pizza, pasta, and drink categories' },
  { type: 'FeaturedItemsCarousel', label: 'Featured Bestsellers', description: 'Showcase top-rated pizzas with instant Add to Cart' },
  { type: 'TestimonialsBlock', label: 'Customer Reviews', description: 'Customer quotes, ratings, and food critic reviews' },
  { type: 'CountdownOfferBlock', label: 'Countdown Flash Sale', description: 'Live ticking timer offer banner with coupon copy button' },
  { type: 'RichTextBlock', label: 'Rich Text / Story', description: 'Custom formatted text section for brand story or details' },
  { type: 'CustomHTMLBlock', label: 'Custom HTML Embed', description: 'Sanitized HTML snippet for custom banners or widgets' },
];

export default function PageBuilderEditor({ slug = 'home' }: { slug?: string }) {
  const user = useAuthStore((s) => s.user);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history'>('editor');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load Initial Draft & Live config
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/page-builder/config/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setBlocks(data.draft && data.draft.length > 0 ? data.draft : data.live || []);
        }
      } catch (err) {
        console.error('[PageBuilderEditor] Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [slug]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock: PageBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      visible: true,
      order: blocks.length,
      props: getDefaultPropsForType(type),
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    showToast(`Added new ${type} block`);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleToggleVisibility = (id: string) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b))
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    // Re-index orders
    newBlocks.forEach((b, i) => (b.order = i));
    setBlocks(newBlocks);
  };

  const handleUpdateProps = (id: string, newProps: Record<string, any>) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...newProps } } : b))
    );
  };

  const handlePublish = async () => {
    if (!user) {
      showToast('You must be logged in to publish', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/page-builder/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, draft: blocks }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Page published live successfully!');
        // Clear public renderer cache
        sessionStorage.removeItem(`page_config_${slug}`);
      } else {
        showToast(data.error || 'Failed to publish page', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Publish request failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchHistory = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/page-builder/versions/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to rollback to version ${versionId}?`)) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/page-builder/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, versionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBlocks(data.blocks);
        showToast(`Rolled back to version ${versionId}`);
        sessionStorage.removeItem(`page_config_${slug}`);
      } else {
        showToast(data.error || 'Rollback failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Rollback error', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading Page Builder Editor...
      </div>
    );
  }

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/90 border-red-500/50 text-red-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            No-Code Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Page Builder — <span className="capitalize">{slug}</span> Page
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tabs */}
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                activeTab === 'editor' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Block Layout
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                activeTab === 'preview' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Preview
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                handleFetchHistory();
              }}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                activeTab === 'history' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Version History
            </button>
          </div>

          <button
            onClick={handlePublish}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl font-black text-xs text-neutral-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Publishing...' : 'Publish Live'}
          </button>
        </div>
      </div>

      {/* TAB 1: Editor View */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Blocks List */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-slate-200">
                Page Blocks ({blocks.length})
              </h2>
            </div>

            {blocks.length === 0 ? (
              <div className="p-10 rounded-2xl bg-neutral-900/50 border border-dashed border-neutral-800 text-center text-slate-400">
                No blocks added yet. Click a block type from the library on the right to start building!
              </div>
            ) : (
              blocks.map((block, idx) => {
                const isSelected = block.id === selectedBlockId;

                return (
                  <div
                    key={block.id}
                    className={`rounded-2xl bg-neutral-900 border p-4 transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-slate-300"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === blocks.length - 1}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-slate-300"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div
                        onClick={() => setSelectedBlockId(block.id)}
                        className="cursor-pointer"
                      >
                        <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-bold text-xs uppercase mb-1">
                          {block.type}
                        </span>
                        <h4 className="text-sm font-black text-white">
                          {block.props?.title || block.props?.headline || block.type}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVisibility(block.id)}
                        className={`p-2 rounded-xl border ${
                          block.visible
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                            : 'bg-neutral-800 border-neutral-700 text-slate-500'
                        }`}
                        title={block.visible ? 'Visible' : 'Hidden'}
                      >
                        {block.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => setSelectedBlockId(block.id)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-slate-300"
                        title="Edit Properties"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemoveBlock(block.id)}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400"
                        title="Delete Block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Block Library & Config Inspector */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Block Inspector */}
            {selectedBlock ? (
              <div className="rounded-3xl bg-neutral-900 border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                  <h3 className="text-base font-black text-amber-400 uppercase tracking-wider">
                    Edit {selectedBlock.type}
                  </h3>
                  <button
                    onClick={() => setSelectedBlockId(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close Inspector
                  </button>
                </div>

                <div className="space-y-4 text-left">
                  {Object.entries(selectedBlock.props || {}).map(([key, val]) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-400 capitalize mb-1">
                        {key}
                      </label>
                      {typeof val === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={(e) =>
                            handleUpdateProps(selectedBlock.id, {
                              [key]: e.target.checked,
                            })
                          }
                          className="w-5 h-5 accent-amber-500 rounded"
                        />
                      ) : typeof val === 'object' ? (
                        <textarea
                          rows={4}
                          value={JSON.stringify(val, null, 2)}
                          onChange={(e) => {
                            try {
                              handleUpdateProps(selectedBlock.id, {
                                [key]: JSON.parse(e.target.value),
                              });
                            } catch (err) {}
                          }}
                          className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(val)}
                          onChange={(e) =>
                            handleUpdateProps(selectedBlock.id, {
                              [key]: e.target.value,
                            })
                          }
                          className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Block Library Palette */}
            <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-6">
              <h3 className="text-base font-black text-white mb-4 text-left">
                Block Library
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {AVAILABLE_BLOCK_TYPES.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleAddBlock(item.type)}
                    className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-left transition-all group flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                        {item.label}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                    <Plus className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Live Preview View */}
      {activeTab === 'preview' && (
        <div className="flex flex-col items-center">
          {/* Device Toggle */}
          <div className="flex items-center gap-2 mb-6 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                previewDevice === 'desktop' ? 'bg-amber-400 text-black' : 'text-slate-400'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Desktop Website
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                previewDevice === 'mobile' ? 'bg-amber-400 text-black' : 'text-slate-400'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile App
            </button>
          </div>

          {/* Preview Container */}
          <div
            className={`w-full transition-all duration-300 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl ${
              previewDevice === 'mobile' ? 'max-w-[410px] min-h-[750px] ring-8 ring-neutral-900' : 'max-w-7xl min-h-[600px]'
            }`}
          >
            <PageRenderer slug={slug} previewBlocks={blocks} />
          </div>
        </div>
      )}

      {/* TAB 3: Version History & Rollback */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-black text-white mb-6 text-left">
            Published Version History
          </h2>
          {versions.length === 0 ? (
            <p className="text-slate-400">No published versions found yet.</p>
          ) : (
            <div className="space-y-4">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                >
                  <div className="text-left">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {ver.id}
                    </span>
                    <h4 className="text-sm font-black text-white mt-1">
                      Published by: {ver.publishedBy || 'System'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {new Date(ver.timestamp).toLocaleString()} • {ver.blocks?.length || 0} blocks
                    </p>
                  </div>
                  <button
                    onClick={() => handleRollback(ver.id)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    Rollback to Version
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDefaultPropsForType(type: BlockType): Record<string, any> {
  switch (type) {
    case 'HeroBanner':
      return {
        headline: 'Crafted for Connoisseurs.',
        subtext: 'Handcrafted with premium artisan ingredients. Delivered hot to your door.',
        ctaText: 'Explore Menu',
        ctaLink: '/menu',
        showSearchInput: true,
      };
    case 'PromoBannerCarousel':
      return {
        autoPlayIntervalMs: 5000,
        banners: [
          {
            id: '1',
            title: '50% OFF Your First Order',
            subtitle: 'Use code FIRST50 at checkout.',
            image: 'https://res.cloudinary.com/diwh22z4a/image/upload/v1711200000/olive-pizza/hero_banner.png',
            link: '/menu',
            tag: 'Limited Offer',
          },
        ],
      };
    case 'CategoryGrid':
      return {
        title: 'Explore Our Categories',
        gridColumns: 4,
      };
    case 'FeaturedItemsCarousel':
      return {
        title: 'Chef Specials & Bestsellers',
        subtitle: 'Handpicked signature creations prepared fresh daily.',
      };
    case 'TestimonialsBlock':
      return {
        title: 'Customer Feedback',
      };
    case 'CountdownOfferBlock':
      return {
        title: 'Midnight Flash Sale',
        discountCode: 'MIDNIGHT40',
      };
    case 'RichTextBlock':
      return {
        title: 'Our Tradition',
        contentHtml: '<p>Authentic wood-fired pizzas crafted with 48-hour fermented dough.</p>',
      };
    case 'CustomHTMLBlock':
      return {
        html: '<div style="padding: 20px; text-align: center; color: #fbbf24;">Custom Embedded Widget</div>',
      };
    default:
      return {};
  }
}
