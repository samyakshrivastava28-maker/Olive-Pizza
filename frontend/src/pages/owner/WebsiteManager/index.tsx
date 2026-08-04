import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Layout,
  Palette,
  Compass,
  Bell,
  Megaphone,
  Sparkles,
  Image,
  ToggleRight,
  BarChart3,
  Split,
  History,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import HomepageBuilder from './HomepageBuilder';
import ThemeManager from './ThemeManager';
import NavigationBuilder from './NavigationBuilder';
import AnnouncementManager from './AnnouncementManager';
import BannerManager from './BannerManager';
import CampaignManager from './CampaignManager';
import MediaLibrary from './MediaLibrary';
import FeatureFlags from './FeatureFlags';
import WebsiteAnalytics from './WebsiteAnalytics';
import ABTesting from './ABTesting';
import VersionHistory from './VersionHistory';
import PermissionsManager from './PermissionsManager';
import AIDesignStudio from './AIDesignStudio';

const TABS = [
  { id: 'homepage', label: 'Homepage Builder', icon: Layout },
  { id: 'ai_studio', label: 'AI Design Studio', icon: Bot },
  { id: 'theme', label: 'Theme & Tokens', icon: Palette },
  { id: 'navigation', label: 'Navigation & Footer', icon: Compass },
  { id: 'announcements', label: 'Announcement Bar', icon: Bell },
  { id: 'banners', label: 'Banners & Ads', icon: Megaphone },
  { id: 'campaigns', label: 'Campaign Engine', icon: Sparkles },
  { id: 'media', label: 'Media Library', icon: Image },
  { id: 'flags', label: 'Feature Flags', icon: ToggleRight },
  { id: 'analytics', label: 'SDUI Analytics', icon: BarChart3 },
  { id: 'ab_testing', label: 'A/B Testing', icon: Split },
  { id: 'history', label: 'Version History', icon: History },
  { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
];

export const WebsiteManagerHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('homepage');

  useEffect(() => {
    // Extract the last part of the path, e.g. /owner/website-manager/theme -> theme
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== 'website-manager' && lastPart !== 'sdui') {
      const validTab = TABS.find(t => t.id === lastPart || t.id.replace('_', '-') === lastPart);
      if (validTab) {
        setActiveTab(validTab.id);
      }
    } else {
      setActiveTab('homepage');
    }
  }, [location.pathname]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    const routeId = tabId.replace('_', '-');
    navigate(`/owner/website-manager/${routeId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Website & App Manager
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-400 font-semibold border border-primary-500/30">
              Server-Driven UI
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Enterprise No-Code CMS & Real-time Visual Platform for Olive Pizza.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'homepage' && <HomepageBuilder />}
        {activeTab === 'ai_studio' && <AIDesignStudio />}
        {activeTab === 'theme' && <ThemeManager />}
        {activeTab === 'navigation' && <NavigationBuilder />}
        {activeTab === 'announcements' && <AnnouncementManager />}
        {activeTab === 'banners' && <BannerManager />}
        {activeTab === 'campaigns' && <CampaignManager />}
        {activeTab === 'media' && <MediaLibrary />}
        {activeTab === 'flags' && <FeatureFlags />}
        {activeTab === 'analytics' && <WebsiteAnalytics />}
        {activeTab === 'ab_testing' && <ABTesting />}
        {activeTab === 'history' && <VersionHistory />}
        {activeTab === 'permissions' && <PermissionsManager />}
      </div>
    </div>
  );
};
export default WebsiteManagerHub;
