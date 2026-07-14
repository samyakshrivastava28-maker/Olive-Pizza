import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cloud, HardDrive, Mail, Bell, Layers, Box, BarChart2 } from 'lucide-react';
import Overview from './Overview';
import ProviderDetail from './ProviderDetail';

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart2, path: '' },
  { id: 'firestore', label: 'Firestore', icon: Database, path: 'firestore' },
  { id: 'supabase', label: 'Supabase', icon: Database, path: 'supabase' },
  { id: 'cloudinary', label: 'Cloudinary', icon: Cloud, path: 'cloudinary' },
  { id: 'drive', label: 'Google Drive', icon: HardDrive, path: 'google-drive' },
  { id: 'qdrant', label: 'Qdrant (AI)', icon: Layers, path: 'qdrant' },
  { id: 'email', label: 'Email Queue', icon: Mail, path: 'email' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: 'notifications' },
];

export default function DataManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden flex flex-col md:flex-row relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#6B8E23] blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#FF7A00] blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Sub-Sidebar */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-64 bg-[#161616]/80 backdrop-blur-xl border-r border-white/10 z-10 flex flex-col"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6B8E23] to-[#FFC107] bg-clip-text text-transparent">
            Data Manager
          </h2>
          <p className="text-sm text-gray-400 mt-1">Real-time Cloud Storage</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (currentPath === 'data-manager' && item.path === '');
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-[#6B8E23]/20 border border-[#6B8E23]/50 rounded-xl"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex items-center space-x-3">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-[#FFC107]' : 'text-gray-500 group-hover:text-[#FFC107]'}`} />
                  <span className="font-medium tracking-wide">{item.label}</span>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 z-0" />
              </button>
            );
          })}
        </nav>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 relative z-10 overflow-y-auto h-screen p-4 md:p-8">
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
