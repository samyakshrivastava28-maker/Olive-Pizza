import React, { useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cloud, HardDrive, Mail, Bell, Layers, BarChart2, Server, FileText } from 'lucide-react';
import Overview from './Overview';
import ProviderDetail from './ProviderDetail';

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart2, path: '', color: '#6B8E23' },
  { id: 'firestore', label: 'Firestore', icon: Database, path: 'firestore', color: '#FF7A00' },
  { id: 'supabase', label: 'PostgreSQL', icon: Database, path: 'supabase', color: '#6B8E23' },
  { id: 'cloudinary', label: 'Cloudinary', icon: Cloud, path: 'cloudinary', color: '#FFC107' },
  { id: 'google-drive', label: 'Google Drive', icon: HardDrive, path: 'google-drive', color: '#4285F4' },
  { id: 'qdrant', label: 'Pinecone', icon: Layers, path: 'qdrant', color: '#E91E63' },
  { id: 'email', label: 'Email', icon: Mail, path: 'email', color: '#9C27B0' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: 'notifications', color: '#00BCD4' },
  { id: 'app-storage', label: 'App Storage', icon: Server, path: 'app-storage', color: '#FF5722' },
  { id: 'logs', label: 'Logs', icon: FileText, path: 'logs', color: '#607D8B' },
];

export default function DataManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Determine active tab from URL
  const pathParts = location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const activeId = lastPart === 'data-manager' ? 'overview' : lastPart;
  const activeItem = navItems.find(n => n.path === activeId || (activeId === 'data-manager' && n.id === 'overview'));
  const activeColor = activeItem?.color || '#6B8E23';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] blur-[160px] rounded-full opacity-20 transition-colors duration-700"
          style={{ background: activeColor }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] blur-[160px] rounded-full opacity-15 transition-colors duration-700"
          style={{ background: activeColor }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]" />
      </div>

      {/* ─── Premium Horizontal Tab Navigation ──────────────────────────────── */}
      <div
        className="relative z-20 sticky top-0"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header row */}
        <div className="px-6 pt-5 pb-0 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight"
              style={{ background: `linear-gradient(135deg, #fff 30%, ${activeColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Data Manager
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Real-time Cloud Storage Intelligence</p>
          </div>
          <div
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
        </div>

        {/* Scrollable Tab Bar */}
        <div
          ref={scrollRef}
          className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.dm-scroll::-webkit-scrollbar { display: none; }`}</style>
          {navItems.map((item) => {
            const isActive = item.id === activeId || (activeId === 'data-manager' && item.id === 'overview');
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path || '.')}
                className="relative flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap"
                style={{
                  color: isActive ? item.color : 'rgba(255,255,255,0.45)',
                  scrollSnapAlign: 'start',
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: item.color }}
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Page Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route index element={<Overview />} />
            <Route path=":provider" element={<ProviderDetail />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}
