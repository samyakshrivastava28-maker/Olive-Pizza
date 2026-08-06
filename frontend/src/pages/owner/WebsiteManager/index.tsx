import React, { useState, useEffect } from 'react';
import { useSDUIStore } from '../../../stores/sduiStore';
import HomepageTab from './tabs/HomepageTab';
import ThemeTab from './tabs/ThemeTab';
import NavigationTab from './tabs/NavigationTab';
import FooterTab from './tabs/FooterTab';
import AnnouncementTab from './tabs/AnnouncementTab';
import CampaignsTab from './tabs/CampaignsTab';
import AIDesignerTab from './tabs/AIDesignerTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import PublishTab from './tabs/PublishTab';
import HomepageRenderer from '../../../components/sdui/HomepageRenderer';
import {
  Layers,
  Palette,
  Compass,
  Layout,
  Megaphone,
  Flame,
  Bot,
  BarChart3,
  Send,
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

type ActiveTab =
  | 'homepage'
  | 'theme'
  | 'navigation'
  | 'footer'
  | 'announcement'
  | 'campaigns'
  | 'ai'
  | 'analytics'
  | 'publish';

export default function WebsiteManagerHub() {
  const subscribe = useSDUIStore((state) => state.subscribe);
  const draftHomepage = useSDUIStore((state) => state.draftHomepage);
  const homepage = useSDUIStore((state) => state.homepage);
  const hasDraft = useSDUIStore((state) => state.hasDraft);

  const canUndo = useSDUIStore((state) => state.canUndo);
  const canRedo = useSDUIStore((state) => state.canRedo);
  const undo = useSDUIStore((state) => state.undo);
  const redo = useSDUIStore((state) => state.redo);
  const resetToDefault = useSDUIStore((state) => state.resetToDefault);

  const [activeTab, setActiveTab] = useState<ActiveTab>('homepage');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [showLivePreviewFrame, setShowLivePreviewFrame] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribe();
    return () => unsub();
  }, [subscribe]);

  const activeSections = (draftHomepage || homepage)?.sections || [];

  const navTabs: Array<{ id: ActiveTab; label: string; icon: any }> = [
    { id: 'homepage', label: 'Homepage Builder', icon: Layers },
    { id: 'theme', label: 'Theme System', icon: Palette },
    { id: 'navigation', label: 'Navigation', icon: Compass },
    { id: 'footer', label: 'Footer Builder', icon: Layout },
    { id: 'announcement', label: 'Announcements', icon: Megaphone },
    { id: 'campaigns', label: 'Campaigns', icon: Flame },
    { id: 'ai', label: 'AI Designer', icon: Bot },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'publish', label: 'Publish & Rollback', icon: Send },
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 min-h-[85vh]">
      {/* Sidebar Controls & Editor */}
      <div className="flex-1 flex flex-col space-y-6 min-w-0">
        {/* Top Header Hub Title */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary-500/20 text-primary-400 text-lg">🎨</span>
              <h1 className="text-2xl font-black text-white tracking-tight">Website Manager</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Single unified Server Driven UI platform for Olive Pizza.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Step Back (Undo) */}
            <button
              onClick={async () => {
                await undo();
                toast.success('Step Back (Undo) applied');
              }}
              disabled={!canUndo}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Step Back (Undo previous layout edit)"
            >
              <Undo2 className="w-3.5 h-3.5" /> Step Back
            </button>

            {/* Step Forward (Redo) */}
            <button
              onClick={async () => {
                await redo();
                toast.success('Step Forward (Redo) applied');
              }}
              disabled={!canRedo}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Step Forward (Redo reverted edit)"
            >
              <Redo2 className="w-3.5 h-3.5" /> Step Forward
            </button>

            {/* Reset to Default */}
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
              title="Reset layout and settings back to default"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>

            {hasDraft && (
              <>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 animate-pulse">
                  ● Draft Unsaved
                </span>
                <button
                  onClick={async () => {
                    await useSDUIStore.getState().publish('Published website updates', 'Owner');
                    toast.success('Website changes published live to real home page!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 font-bold text-xs text-white shadow-lg shadow-green-500/20"
                >
                  🚀 Publish Live
                </button>
              </>
            )}

            <button
              onClick={() => setShowLivePreviewFrame(!showLivePreviewFrame)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 hover:text-white"
            >
              <Eye className="w-4 h-4" /> {showLivePreviewFrame ? 'Hide Frame' : 'Show Frame'}
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-white/10 overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Tool Sub-View */}
        <div className="flex-1 p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
          {activeTab === 'homepage' && <HomepageTab />}
          {activeTab === 'theme' && <ThemeTab />}
          {activeTab === 'navigation' && <NavigationTab />}
          {activeTab === 'footer' && <FooterTab />}
          {activeTab === 'announcement' && <AnnouncementTab />}
          {activeTab === 'campaigns' && <CampaignsTab />}
          {activeTab === 'ai' && <AIDesignerTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'publish' && <PublishTab />}
        </div>
      </div>

      {/* Live Device Frame Preview Switcher */}
      {showLivePreviewFrame && (
        <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Live Draft Preview
              </span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800 border border-white/5">
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded-lg transition-all ${
                  deviceMode === 'mobile' ? 'bg-primary-500 text-white' : 'text-slate-400'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={`p-1.5 rounded-lg transition-all ${
                  deviceMode === 'tablet' ? 'bg-primary-500 text-white' : 'text-slate-400'
                }`}
                title="Tablet View"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded-lg transition-all ${
                  deviceMode === 'desktop' ? 'bg-primary-500 text-white' : 'text-slate-400'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`w-full bg-[#06070a] border-4 border-slate-800 rounded-[36px] overflow-hidden shadow-2xl p-4 transition-all ${
              deviceMode === 'mobile'
                ? 'max-w-[380px] mx-auto min-h-[640px]'
                : deviceMode === 'tablet'
                ? 'max-w-[440px] mx-auto min-h-[640px]'
                : 'max-w-[100%] min-h-[600px]'
            }`}
          >
            <div className="w-full h-full overflow-y-auto max-h-[700px] custom-scrollbar rounded-2xl p-2 bg-[#06070a]">
              <HomepageRenderer overrideSections={activeSections} />
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-white">Reset Website to Default?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to reset all website sections, layout order, theme colors, and navigation back to default settings?
            </p>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await resetToDefault();
                  setIsResetModalOpen(false);
                  toast.success('Website reset back to default layout!');
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all"
              >
                Yes, Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
